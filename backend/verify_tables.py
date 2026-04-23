import asyncio
from sqlalchemy import inspect
from app.db import engine

async def get_tables():
    async with engine.connect() as conn:
        tables = await conn.run_sync(lambda sync_conn: inspect(sync_conn).get_table_names())
        print(tables)

if __name__ == "__main__":
    asyncio.run(get_tables())
