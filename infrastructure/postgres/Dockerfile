FROM postgres:17.0

# bootstrap.sh will initialise the database by:
# - Creating a 'transport_system' user, with password 'transport_localdev'
# - Creating a 'transport_localdev' database, owned by this user
RUN apt-get update && apt-get install -y gosu && rm -rf /var/lib/apt/lists/*
COPY scripts/bootstrap.sh .
COPY scripts/bootstrap.sql .
RUN sed -i 's/\r$//' ./bootstrap.sh && chmod +x ./bootstrap.sh
RUN gosu postgres bash ./bootstrap.sh

# Start the database
EXPOSE 5432
CMD ["gosu", "postgres", "postgres"]