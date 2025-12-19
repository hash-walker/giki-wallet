-- Create Transport admin user
CREATE USER transport WITH PASSWORD 'transport_localdev';

-- Create empty Transport database, owned by this user
CREATE DATABASE transport_localdev OWNER transport;
\connect transport_localdev;

CREATE SCHEMA transport AUTHORIZATION transport;