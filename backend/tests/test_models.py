import pytest
import uuid
import pytest_asyncio
from sqlalchemy.future import select
from app.db import AsyncSessionLocal
from app.models.models import Organization, User, Meeting, Role

@pytest_asyncio.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest.mark.asyncio
async def test_tenant_isolation(db_session):
    # Setup roles if not exists
    role_id = uuid.uuid4()
    role = Role(id=role_id, role_name="Admin_Test")
    db_session.add(role)

    # 1. Create an organization
    org_a = Organization(name="Organization A")
    db_session.add(org_a)
    await db_session.flush()

    # 2. Create a user in that organization
    user_a = User(
        name="User A",
        email="usera@orga.com",
        organization_id=org_a.id,
        role_id=role.id
    )
    db_session.add(user_a)
    await db_session.flush()

    # 3. Create a meeting for that org
    meeting_a = Meeting(
        title="Meeting for Org A",
        organization_id=org_a.id,
        uploaded_by=user_a.id
    )
    db_session.add(meeting_a)
    await db_session.flush()

    # Create Organization B
    org_b = Organization(name="Organization B")
    db_session.add(org_b)
    await db_session.flush()

    # 4. Assert querying meetings with different org_id returns 0 results
    stmt = select(Meeting).where(Meeting.organization_id == org_b.id)
    result = await db_session.execute(stmt)
    meetings = result.scalars().all()

    assert len(meetings) == 0

    # Sanity check: Ensure meeting for Org A exists
    stmt_a = select(Meeting).where(Meeting.organization_id == org_a.id)
    result_a = await db_session.execute(stmt_a)
    meetings_a = result_a.scalars().all()

    assert len(meetings_a) == 1
    assert meetings_a[0].title == "Meeting for Org A"
