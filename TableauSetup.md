# Tableau Setup Steps

To setup tableau instance, you will need to SSH into the actual EC2 instance with the private key-pairs from the respective environments.

Run through the following scripts below to setup the tableau instance (**NOTE: for ubuntu server, tableau only supports 16.04 and 18.04 LTS version**):

## Installation Preparation

```
# Tableau (before the next release) uses `tbladmin` OS user, need to be added 
sudo adduser tbladmin 
# Followed by the password and confirm-password of the new user added 

# Grant the user in the sudoer file
sudo visudo
# Add the following line into the file
##
## tbladmin ALL=(ALL:ALL) ALL
##
# press Ctrl+X and then press Y to save changes, press ENTER to exit the editor

# Update the timezone to Singapore (UTC+8)
sudo unlink /etc/localtime
sudo ln -s /usr/share/zoneinfo/Asia/Singapore /etc/localtime

# Verify the timezone has been updated correctly using the following command:
timedatectl
```

## Installation of Tableau 

```
# All installation and setup has to be done using the `tbladmin` user created in the previous step
su - tbladmin
# type the password from the previous step 
sudo apt-get update 
# type the same password from the previous step 
sudo apt-get install git zsh tmux slapd ldap-utils aria2 gdebi-core zip

mkdir install && cd install 
aria2c -s 5 -x 5 https://downloads.tableau.com/esdalt/2022.1.1/tableau-server-2022-1-1_amd64.deb
sudo gdebi -n tableau-server-2022-1-1_amd64.deb


# After installation completed 
sudo /opt/tableau/tableau_server/packages/scripts.20221.22.0415.1144/initialize-tsm --accepteula

# Logs can be found in the following locations:
# /var/opt/tableau/tableau_server/logs/app-install.log
# /var/opt/tableau/tableau_server/data/tabsvc/logs/tabadmincontroller/control_tabadmincontroller_node1-0.log
```

## Tableau Activation and Starting TSM 

Make sure the following scripts are executed using the `tbladmin` user created earlier.

Use `su - tbladmin` to re-login to the user if the ssh pipe was broken.

```
source /etc/profile.d/tableau_server.sh 

# Replace the license key below
tsm licenses activate -k <KEY>

tsm login -u tbladmin
# type the password from the previous step 

# create new directory to store registration and other files if any
mkdir config && cd config
tsm register --template > registration_file.json

# Update the generated json registration template according to the need 
# Run the following command to register tableau 
tsm register --file registration_file.json

# Use default configuration (local identity store)
tsm settings import -f /opt/tableau/tableau_server/packages/scripts.20221.22.0415.1144/config.json
tsm pending-changes apply

# Initialize TSM service and initial dashboard user 
tsm initialize --start-server --request-timeout 1800
# feel free to update the username password for the default user of the tableau dashboard
tabcmd initialuser --server 'localhost:80' --username 'admin' --password 'admin'
```

## Tableau Server JDBC Driver Setup 

Make sure the following scripts are executed using the `tbladmin` user created earlier.

Use `su - tbladmin` to re-login to the user if the ssh pipe was broken.

```
# Go to the directory where tableau was installed
cd /opt/tableau

# Create directory if not exits
sudo mkdir -p tableau_driver/jdbc 

# Download the respective driver jar into this directory 
cd tableau_driver/jdbc 
sudo wget https://repo1.maven.org/maven2/com/facebook/presto/presto-jdbc/0.273.3/presto-jdbc-0.273.3.jar 
```
