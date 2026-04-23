from fastapi import APIRouter, Depends, HTTPException, status
import sqlalchemy
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserSchema
from app.models.models import Organization, User, Role
from app.services.auth_service import get_password_hash, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, db: AsyncSession = Depends(get_db)):

    # Fetch Admin role
    stmt = select(Role).where(Role.role_name == "Admin")
    result = await db.execute(stmt)
    admin_role = result.scalars().first()
    
    if not admin_role:
        # For testing/initial setup, if Admin role doesn't exist, create it
        admin_role = Role(role_name="Admin")
        db.add(admin_role)
        await db.flush()

    try:
        # The transaction is automatically managed by the AsyncSession per request
        # if not, we can begin a nested transaction to ensure atomicity
        async with db.begin_nested():
            new_org = Organization(name=request.org_name)
            db.add(new_org)
            await db.flush() # flush to get org.id

            hashed_password = get_password_hash(request.password)
            new_user = User(
                name=request.user_name,
                email=request.email,
                password_hash=hashed_password,
                organization_id=new_org.id,
                role_id=admin_role.id
            )
            db.add(new_user)
            await db.flush()
            
            # Commit nested transaction explicitly
        await db.commit()
    except sqlalchemy.exc.IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail="Registration failed, transaction rolled back")
    
    return UserSchema(
        id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        organization_id=new_user.organization_id,
        role_id=new_user.role_id,
        role_name="Admin",
        created_at=new_user.created_at
    )

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalars().first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    # Need to fetch role to inject role_name in token
    stmt_role = select(Role).where(Role.id == user.role_id)
    result_role = await db.execute(stmt_role)
    role = result_role.scalars().first()
    role_name = role.role_name if role else "Employee"

    access_token = create_access_token(
        data={
            "user_id": str(user.id),
            "organization_id": str(user.organization_id),
            "role_id": str(user.role_id),
            "role_name": role_name,
            "email": user.email,
            "name": user.name or ""
        }
    )
    return TokenResponse(access_token=access_token)

@router.get("/me", response_model=UserSchema)
async def read_users_me(current_user: UserSchema = Depends(get_current_user)):
    return current_user
