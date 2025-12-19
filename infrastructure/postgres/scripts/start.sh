#!/bin/bash
set -Eeuo pipefail

# Start the database to listen for connections
gosu postgres postgres