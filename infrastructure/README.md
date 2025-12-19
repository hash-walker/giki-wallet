# Running

```
docker build -t transport-localdev-db .
docker run -p 5432:5432 transport-localdev-db
```

Now, you'll have a database running on localhost:5432.
You can connect to it with username 'transport', and password 'teemcamp_localdev'.