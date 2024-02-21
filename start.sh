#!/bin/bash
source ~/.nvm/nvm.sh

# Function to display green text
green_echo() {
    echo -e "\e[32;1m$1\e[0m"
}

# Define the directory paths
main_dir="/var/cron/bridge-core"
sub_dir="$main_dir/price_updater"

# Navigate to the main directory
cd "$main_dir" || exit

# Run all JS files in the main directory with PM2
for js_file in *.js; do
  pm2 start "$js_file" --name "$(basename "$js_file" .js)"
done

# Navigate to the subdirectory
cd "$sub_dir" || exit

# Run all JS files in the subdirectory with PM2
for js_file in *.js; do
  pm2 start "$js_file" --name "$(basename "$js_file" .js)"
done

# Save the current PM2 configuration
pm2 save

# List all PM2 processes
pm2_list_output=$(pm2 ls)

# Display a message
green_echo "Started scripts:"
echo "$pm2_list_output"
