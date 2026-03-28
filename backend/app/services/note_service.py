from io import BytesIO
from pathlib import Path
from uuid import UUID
from xml.etree import ElementTree
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.note import Note
from app.models.user import Profile
from app.schemas.note import NoteCreate, NoteUpdate


class NoteService:
    @staticmethod
    def extract_import_text(filename: str, raw_content: bytes) -> str:
        suffix = Path(filename).suffix.lower()
        if suffix == ".txt":
            return NoteService._extract_txt_text(raw_content)
        if suffix == ".pdf":
            return NoteService._extract_pdf_text(raw_content)
        if suffix == ".docx":
            return NoteService._extract_docx_text(raw_content)
        if suffix == ".doc":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Legacy .doc files are not supported. Please upload .docx instead.",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt, .pdf, and .docx uploads are supported.",
        )

    @staticmethod
    def _extract_txt_text(raw_content: bytes) -> str:
        try:
            return raw_content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded .txt files must be UTF-8 encoded.",
            ) from exc

    @staticmethod
    def _extract_pdf_text(raw_content: bytes) -> str:
        try:
            from pypdf import PdfReader
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="PDF import support is not installed. Run `uv add pypdf` and sync dependencies.",
            ) from exc

        try:
            reader = PdfReader(BytesIO(raw_content))
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to read the uploaded PDF file.",
            ) from exc

        text_parts: list[str] = []
        for page in reader.pages:
            extracted = page.extract_text() or ""
            if extracted.strip():
                text_parts.append(extracted.strip())
        return "\n\n".join(text_parts)

    @staticmethod
    def _extract_docx_text(raw_content: bytes) -> str:
        try:
            with ZipFile(BytesIO(raw_content)) as archive:
                document_xml = archive.read("word/document.xml")
        except (BadZipFile, KeyError) as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to read the uploaded .docx file.",
            ) from exc

        try:
            root = ElementTree.fromstring(document_xml)
        except ElementTree.ParseError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The uploaded .docx file appears to be malformed.",
            ) from exc

        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        paragraphs: list[str] = []
        for paragraph in root.findall(".//w:p", namespace):
            text_fragments = [
                node.text
                for node in paragraph.findall(".//w:t", namespace)
                if node.text
            ]
            line = "".join(text_fragments).strip()
            if line:
                paragraphs.append(line)
        return "\n\n".join(paragraphs)

    @staticmethod
    def _derive_import_title(
        *,
        explicit_title: str | None,
        pasted_text: str | None,
        filename: str | None,
    ) -> str:
        if explicit_title and explicit_title.strip():
            return explicit_title.strip()
        if filename:
            return Path(filename).stem[:255] or "Imported Note"
        if pasted_text:
            first_line = next(
                (line.strip() for line in pasted_text.splitlines() if line.strip()),
                "",
            )
            if first_line:
                return first_line[:255]
        return "Imported Note"

    @staticmethod
    def import_note(
        db: Session,
        owner: Profile,
        *,
        pasted_text: str | None,
        file_content: str | None,
        filename: str | None,
        title: str | None,
        source_language: str,
    ) -> Note:
        content = (pasted_text or "").strip() or (file_content or "").strip()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Provide pasted text or a non-empty .txt, .pdf, or .docx file.",
            )

        note = Note(
            owner_id=owner.id,
            title=NoteService._derive_import_title(
                explicit_title=title,
                pasted_text=content,
                filename=filename,
            ),
            content=content,
            source_language=source_language,
            imported_file_path=filename,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def _parse_note_uuid(note_id: str | UUID) -> UUID:
        if isinstance(note_id, UUID):
            return note_id
        return UUID(note_id)

    @staticmethod
    def create_note(db: Session, owner: Profile, payload: NoteCreate) -> Note:
        note = Note(
            owner_id=owner.id,
            title=payload.title,
            content=payload.content,
            source_language=payload.source_language,
            imported_file_path=payload.imported_file_path,
        )
        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def list_notes(db: Session, owner: Profile) -> list[Note]:
        stmt = (
            select(Note)
            .where(Note.owner_id == owner.id)
            .order_by(Note.updated_at.desc())
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def get_note_or_404(db: Session, owner: Profile, note_id: str | UUID) -> Note:
        stmt = select(Note).where(
            Note.id == NoteService._parse_note_uuid(note_id),
            Note.owner_id == owner.id,
        )
        note = db.scalar(stmt)
        if note is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found.",
            )
        return note

    @staticmethod
    def update_note(
        db: Session,
        owner: Profile,
        note_id: str | UUID,
        payload: NoteUpdate,
    ) -> Note:
        note = NoteService.get_note_or_404(db, owner, note_id)
        updates = payload.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(note, field, value)

        db.add(note)
        db.commit()
        db.refresh(note)
        return note

    @staticmethod
    def delete_note(db: Session, owner: Profile, note_id: str | UUID) -> None:
        note = NoteService.get_note_or_404(db, owner, note_id)
        db.delete(note)
        db.commit()
