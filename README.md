
# Bridge-setup-utility
A shell script to automate cross chain bridge installation
## Usage Guide
The whole process of setting up the cross-chain bridge is divided into three parts:

 - Run the setup.sh
 - Modify the .env file located at /var/cron/bridge-core/ and /var/cron/bridge-core/price_updater/
 - Run the start.sh

Login to your ubuntu linux server via ssh or putty.
Enter below command
```bash
./setup.sh
```
You'll see created username, password and database information on the terminal. Use that information and modify these two files:
- /var/cron/bridge-core/.env
- /var/cron/bridge-core/price_updater/.env
Also update the signer private key and public address in the .env file located at /var/cron/bridge-core/.env

You can use nano text editor to make above changes or just use filezilla/termice

After modifications, run the below given command to start the bride backend:
```bash
./start.sh
```

After this you can monitor the running bridge via 
```bash
pm2 ls
```
If you get any error like "pm2 not installed or pm2 not found" then simply logout from the server and login again