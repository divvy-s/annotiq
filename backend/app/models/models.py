import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Float, Date, Index
from sqlalchemy.dialects.postgresql import UUID, TSVECTOR
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.db import Base

def utc_now():
    return datetime.now(timezone.utc)

class Organization(Base):
    __tablename__ = 'organizations'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text, nullable=False)
    plan_type = Column(Text, default='free')
    created_at = Column(DateTime(timezone=True), default=utc_now)

    users = relationship("User", back_populates="organization")
    meetings = relationship("Meeting", back_populates="organization")

class Role(Base):
    __tablename__ = 'roles'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_name = Column(Text, unique=True, nullable=False)

    users = relationship("User", back_populates="role")
    permissions = relationship("RolePermission", back_populates="role")

class User(Base):
    __tablename__ = 'users'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(Text)
    email = Column(Text, unique=True, nullable=False)
    password_hash = Column(Text)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="users")
    role = relationship("Role", back_populates="users")
    meetings = relationship("Meeting", back_populates="uploader")

    __table_args__ = (
        Index('ix_users_org_created', 'organization_id', 'created_at'),
    )

class Meeting(Base):
    __tablename__ = 'meetings'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    title = Column(Text)
    description = Column(Text)
    file_url = Column(Text)
    media_type = Column(Text)
    status = Column(Text, default='pending')
    created_at = Column(DateTime(timezone=True), default=utc_now)

    organization = relationship("Organization", back_populates="meetings")
    uploader = relationship("User", back_populates="meetings")
    speakers = relationship("Speaker", back_populates="meeting")

    __table_args__ = (
        Index('ix_meetings_org_created', 'organization_id', 'created_at'),
    )

class Speaker(Base):
    __tablename__ = 'speakers'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey('meetings.id'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    speaker_label = Column(Text)
    display_name = Column(Text)

    meeting = relationship("Meeting", back_populates="speakers")

    # Assuming created_at is needed for composite index on organization_id, though not in spec. 
    # Spec says: "Every table with organization_id must have a composite index on (organization_id, created_at)"
    # I'll add created_at.
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index('ix_speakers_org_created', 'organization_id', 'created_at'),
    )

class TranscriptChunk(Base):
    __tablename__ = 'transcript_chunks'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey('meetings.id'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    speaker_id = Column(UUID(as_uuid=True), ForeignKey('speakers.id'), nullable=True)
    chunk_text = Column(Text)
    timestamp_start = Column(Float)
    timestamp_end = Column(Float)
    embedding = Column(Vector(1536))
    tsvector_col = Column(TSVECTOR)
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index('ix_chunks_org_created', 'organization_id', 'created_at'),
    )

class Summary(Base):
    __tablename__ = 'summaries'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey('meetings.id'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    short_summary = Column(Text)
    detailed_summary = Column(Text)
    summary_embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index('ix_summaries_org_created', 'organization_id', 'created_at'),
    )

class ActionItem(Base):
    __tablename__ = 'action_items'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey('meetings.id'), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    assigned_to = Column(Text)
    description = Column(Text)
    due_date = Column(Date)
    status = Column(Text, default='open')
    embedding = Column(Vector(1536))
    created_at = Column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        Index('ix_action_items_org_created', 'organization_id', 'created_at'),
    )

class MeetingAccess(Base):
    __tablename__ = 'meeting_access'
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey('meetings.id'), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    permission_level = Column(Text)

class RolePermission(Base):
    __tablename__ = 'role_permissions'
    role_id = Column(UUID(as_uuid=True), ForeignKey('roles.id'), primary_key=True)
    permission_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    permission_name = Column(Text)

    role = relationship("Role", back_populates="permissions")
