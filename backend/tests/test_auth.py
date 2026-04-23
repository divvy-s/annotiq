import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import timedelta
from sqlalchemy.future import select
from app.main import app
from app.db import AsyncSessionLocal
from app.models.models import Organization, User, Role
from app.api.deps import require_role, get_current_user
from app.services.auth_service import create_access_token
from fastapi import Depends, Request

# Register dummy routes for testing
@app.get("/api/dummy-admin")
async def dummy_admin(user = Depends(require_role("Admin"))):
    return {"status": "ok"}

@app.get("/api/dummy-tenant")
async def dummy_tenant(request: Request, user = Depends(get_current_user)):
    return {"org_id": str(request.state.organization_id)}

@pytest_asyncio.fixture
async def db_session():
    async with AsyncSessionLocal() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_register_creates_org_and_user_atomically(client, db_session):
    payload = {
        "org_name": "Test Org Atom",
        "user_name": "Atom User",
        "email": f"atom_{uuid.uuid4()}@example.com",
        "password": "password123"
    }
    
    response = await client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == payload["email"]
    assert "id" in data
    assert "organization_id" in data

    # Verify in DB
    user_stmt = select(User).where(User.email == payload["email"])
    res = await db_session.execute(user_stmt)
    user = res.scalars().first()
    assert user is not None

    org_stmt = select(Organization).where(Organization.id == user.organization_id)
    res_org = await db_session.execute(org_stmt)
    org = res_org.scalars().first()
    assert org is not None
    assert org.name == payload["org_name"]

@pytest.mark.asyncio
async def test_register_rollback_on_failure(client, db_session):
    # If we register with the same email, it should fail
    # We will insert a user first
    email = f"rollback_{uuid.uuid4()}@example.com"
    payload = {
        "org_name": "Test Org Rollback",
        "user_name": "Rollback User",
        "email": email,
        "password": "password123"
    }
    # Success first time
    await client.post("/api/auth/register", json=payload)
    
    # Try again with a DIFFERENT org name but SAME email
    # Org creation would normally succeed before email unique constraint fails
    payload2 = {
        "org_name": "Should Not Exist Org",
        "user_name": "Rollback User 2",
        "email": email,
        "password": "password123"
    }
    response = await client.post("/api/auth/register", json=payload2)
    assert response.status_code == 400

    # Ensure "Should Not Exist Org" was rolled back
    org_stmt = select(Organization).where(Organization.name == "Should Not Exist Org")
    res_org = await db_session.execute(org_stmt)
    org = res_org.scalars().first()
    assert org is None

@pytest.mark.asyncio
async def test_login_returns_valid_jwt(client):
    email = f"login_{uuid.uuid4()}@example.com"
    payload = {
        "org_name": "Login Org",
        "user_name": "Login User",
        "email": email,
        "password": "password123"
    }
    await client.post("/api/auth/register", json=payload)

    login_payload = {
        "email": email,
        "password": "password123"
    }
    response = await client.post("/api/auth/login", json=login_payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data

    token = data["access_token"]
    
    # Use the token to fetch me
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == login_payload["email"]

@pytest.mark.asyncio
async def test_employee_gets_403_on_admin(client, db_session):
    # Create employee role
    emp_role = Role(role_name=f"Employee_{uuid.uuid4()}")
    db_session.add(emp_role)
    org = Organization(name="Emp Org")
    db_session.add(org)
    await db_session.flush()

    unique_email = f"emp_{uuid.uuid4()}@example.com"
    user = User(
        name="Emp User",
        email=unique_email,
        password_hash="hash",
        organization_id=org.id,
        role_id=emp_role.id
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()

    token = create_access_token({
        "user_id": str(user.id),
        "organization_id": str(org.id),
        "role_id": str(emp_role.id),
        "role_name": "Employee",
        "email": unique_email,
        "name": "Emp User"
    })

    # Try accessing admin endpoint
    response = await client.get("/api/dummy-admin", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_tenant_isolation(client):
    email = f"tenant_{uuid.uuid4()}@example.com"
    payload = {
        "org_name": "Tenant A",
        "user_name": "User A",
        "email": email,
        "password": "password123"
    }
    resp = await client.post("/api/auth/register", json=payload)
    org_a_id = resp.json()["organization_id"]

    login_payload = {
        "email": email,
        "password": "password123"
    }
    token_resp = await client.post("/api/auth/login", json=login_payload)
    token = token_resp.json()["access_token"]

    # Endpoint decodes token and returns org_id injected by middleware
    test_resp = await client.get("/api/dummy-tenant", headers={"Authorization": f"Bearer {token}"})
    assert test_resp.status_code == 200
    assert test_resp.json()["org_id"] == org_a_id

@pytest.mark.asyncio
async def test_expired_token_returns_401(client):
    token = create_access_token(
        data={
            "user_id": str(uuid.uuid4()),
            "organization_id": str(uuid.uuid4()),
            "role_id": str(uuid.uuid4()),
            "role_name": "Admin",
            "email": "expired@example.com",
            "name": "Expired User"
        },
        expires_delta=timedelta(seconds=-1) # Expired
    )

    response = await client.get("/api/dummy-tenant", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
