import redis

r = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True,
    socket_timeout=0.2,
    socket_connect_timeout=0.2
)
