from typing import Any, Dict

def test_redis_connection(dsn: str) -> Dict[str, Any]:
    try:
        import redis
        client = redis.from_url(dsn, socket_connect_timeout=3)
        client.ping()
        client.close()
        return {"status": "success", "message": "Redis connection successful"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}

def test_mysql_connection(dsn: str) -> Dict[str, Any]:
    try:
        from sqlalchemy import create_engine, text
        dsn = dsn.replace('aiomysql', 'pymysql')
        engine = create_engine(dsn, connect_args={"connect_timeout": 3})
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "success", "message": "MySQL connection successful"}
    except Exception as e:
        return {"status": "failed", "error": str(e)}
