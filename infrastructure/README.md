# Running

```
docker build -t giki-wallet-local-db .
docker run -p 5432:5432 giki-wallet-local-db
```

Now, you'll have a database running on localhost:5432.
You can connect to it with username 'giki', and password 'giki_wallet'.