#!/usr/bin/env bash

# This script is based on https://github.com/docker-library/postgres/blob/master/docker-ensure-initdb.sh,
# which provides an example of how to extend / modify the behaviour of docker-entrypoint.sh

set -Eeuo pipefail

################################################################
# CREATE DATABASE
################################################################
export POSTGRES_PASSWORD=temp_boostrap_password
source /usr/local/bin/docker-entrypoint.sh

docker_setup_env
docker_create_db_directories
docker_verify_minimum_env

docker_init_database_dir
pg_setup_hba_conf postgres

docker_temp_server_start postgres
docker_setup_db

################################################################
# TRANSPORT BOOTSTRAPPING
################################################################
echo "Bootstrapping database..."
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f bootstrap.sql

################################################################
# CLEANUP
################################################################
docker_temp_server_stop
unset POSTGRES_PASSWORD