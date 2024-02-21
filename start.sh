#!/bin/bash
source ~/.nvm/nvm.sh

# Define the directory paths
main_dir="/var/cron/bridge-core"
sub_dir="$main_dir/price_updater"

# Navigate to the main directory
cd "$main_dir" || exit

# Run all JS files in the main directory with PM2
pm2 start *.js --name bridge-core

# Navigate to the subdirectory
cd "$sub_dir" || exit

# Run all JS files in the subdirectory with PM2
pm2 start *.js --name price-updater

# Save the current PM2 configuration
pm2 save

# List all PM2 processes
pm2_list_output=$(pm2 ls)

# Display a message
echo "Started scripts:"
echo "$pm2_list_output"
