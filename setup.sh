#!/bin/bash

# Function to display symbol art
display_art() {
    echo "  __  __ _____ _   _ _    _ "
    echo " |  \/  |  ___| \ | | |  | |"
    echo " | |\/| | |_  |  \| | |  | |"
    echo " | |  | |  _| | |\  | |__| |"
    echo " |_|  |_|_|   |_| \_|_____/ "
}

# Display welcome message
echo ""
display_art
echo "Welcome to MainnetZ Setup Utility!"
echo ""

# Task 1: Update and upgrade the system
echo "Initiating Task 1: Update and upgrade the system"
apt-get update
apt-get upgrade -y
echo "Completed Task 1: Update and upgrade the system"
echo ""

# Task 2: Install the latest Node.js version and pm2 via nvm
echo "Initiating Task 2: Install Node.js and pm2 via nvm"
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
source ~/.bashrc
nvm install node
npm install -g pm2
echo "Completed Task 2: Install Node.js and pm2 via nvm"
echo ""

# Task 3: Install MySQL
echo "Initiating Task 3: Install MySQL"
apt-get install mysql-server -y
echo "Completed Task 3: Install MySQL"
echo ""

# Task 4: Create MySQL user with root privilege and grant privileges to a database
echo "Initiating Task 4: Create MySQL user and grant privileges"
read -p "Enter MySQL username: " mysql_username
read -s -p "Enter MySQL password: " mysql_password
mysql -e "CREATE USER '$mysql_username'@'localhost' IDENTIFIED BY '$mysql_password';"
mysql -e "GRANT ALL PRIVILEGES ON *.* TO '$mysql_username'@'localhost' WITH GRANT OPTION;"
mysql -e "FLUSH PRIVILEGES;"
echo "Completed Task 4: Created MySQL user and granted privileges"
echo ""

# Task 5: Create a database with a name provided by user input
echo "Initiating Task 5: Create MySQL database"
read -p "Enter the name for the MySQL database: " mysql_db_name
mysql -e "CREATE DATABASE IF NOT EXISTS $mysql_db_name;"
echo "Completed Task 5: Created MySQL database"
echo ""

# Task 6: Grant privileges to the MySQL user for the specified database
echo "Initiating Task 6: Grant privileges to MySQL user for the database"
mysql -e "GRANT ALL PRIVILEGES ON $mysql_db_name.* TO '$mysql_username'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"
echo "Completed Task 6: Granted privileges to MySQL user for the database"
echo ""

# Task 7: Import SQL file into the database
echo "Initiating Task 7: Import SQL file into the database"
mysql -u "$mysql_username" -p"$mysql_password" "$mysql_db_name" < ./src/bridge-core/bridge.sql
echo "Completed Task 7: Imported SQL file into the database"
echo ""

# Task 8: Copy "bridge-core" directory to /var/cron
echo "Initiating Task 8: Copy 'bridge-core' directory to /var/cron"
mkdir -p /var/cron
cp -r ./src/bridge-core /var/cron/
echo "Completed Task 8: Copied 'bridge-core' directory to /var/cron"
echo ""

# Task 9: Run npm install in /var/cron/bridge-core and /var/cron/bridge-core/price_updater
echo "Initiating Task 9: Run npm install in /var/cron/bridge-core and /var/cron/bridge-core/price_updater"
cd /var/cron/bridge-core
npm install
# echo "Completed Task 9: npm install in /var/cron/bridge-core"

# Go into the "price_updater" directory and run "npm install"
# echo "Initiating Task 9: Run npm install in /var/cron/bridge-core/price_updater"
cd price_updater
npm install
echo "Completed Task 9"
cd ../../  # Return to the original directory

# Display information at the end
echo "Setup completed successfully!"
echo "MySQL Username: $mysql_username"
echo "MySQL Password: $mysql_password"
echo "Database Name: $mysql_db_name"
echo ""
