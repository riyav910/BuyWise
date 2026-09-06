import redis

r = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True,
    socket_timeout=2.0,
    socket_connect_timeout=2.0
)