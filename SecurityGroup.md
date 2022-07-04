# Security Group Configurations

There are total 7 distinguishable security groups required for setting up the environments.

All security groups will have egress rules to all IPv4 and IPv6 address.

For security groups ingress rules please refer to the table below:

| Security Group | Purpose | Type | Protocol | Port Range | Source | Description |
| :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| sg-alb1 | Tableau | HTTP | TCP | 80 | 0.0.0.0/0 | Allow all HTTP traffic from internet |
| sg-alb1 | Tableau | HTTPS | TCP | 443 | 0.0.0.0/0 | Allow all HTTPS traffic from internet |
| sg-alb2 | EMR | HTTP | TCP | 80 | 0.0.0.0/0 | Allow all HTTP traffic from internet |
| sg-alb2 | EMR | HTTPS | TCP | 443 | 0.0.0.0/0 | Allow all HTTPS traffic from internet |
| sg-tableau | Tableau EC2 | HTTP | TCP | 80 | sg-alb1 | HTTP access from ALB-1 (user access) |
| sg-tableau | Tableau EC2 | HTTPS | TCP | 443 | sg-alb1 | HTTPS access from ALB-1 (user access) |
| sg-tableau | Tableau EC2 | Custom TCP | TCP | 8850 | sg-alb2 | Tableau admin portal access from ALB-2 (admin access) |
| sg-emr-service | EMR service | All TCP | TCP | 0-65535 | sg-emr-master | Open all TCP ports from EMR master groups |
| sg-emr-master | EMR master | Custom TCP | TCP | 8443 | sg-emr-service | Allow EMR service group to access 8443 port |
| sg-emr-master | EMR master | All TCP | TCP | 0-65535 | sg-emr-master | Open all TCP ports for same security group |
| sg-emr-master | EMR master | All TCP | TCP | 0-65535 | sg-emr-slave | Open all TCP ports for EMR slave group |
| sg-emr-master | EMR master | All UDP | UDP | 0-65535 | sg-emr-master | Open all UDP ports for same security group |
| sg-emr-master | EMR master | All UDP | UDP | 0-65535 | sg-emr-slave | Open all UDP ports for EMR slave group |
| sg-emr-master | EMR master | All ICMP - IPv4 | ICMP | All | sg-emr-master | Open all ICMP ports for same security group |
| sg-emr-master | EMR master | All ICMP - IPv4 | ICMP | All | sg-emr-slave | Open all ICMP ports for EMR slave group |
| sg-emr-slave | EMR slave | Custom TCP | TCP | 8443 | sg-emr-service | Allow EMR service group to access 8443 port |
| sg-emr-slave | EMR slave | All TCP | TCP | 0-65535 | sg-emr-master | Open all TCP ports for EMR master group |
| sg-emr-slave | EMR slave | All TCP | TCP | 0-65535 | sg-emr-slave | Open all TCP ports for same group |
| sg-emr-slave | EMR slave | All UDP | UDP | 0-65535 | sg-emr-master | Open all UDP ports for EMR master group |
| sg-emr-slave | EMR slave | All UDP | UDP | 0-65535 | sg-emr-slave | Open all UDP ports for same group |
| sg-emr-slave | EMR slave | All ICMP - IPv4 | ICMP | All | sg-emr-master | Open all ICMP ports for EMR master group |
| sg-emr-slave | EMR slave | All ICMP - IPv4 | ICMP | All | sg-emr-slave | Open all ICMP ports for same group |
| sg-rds | RDS | Custom TCP | TCP | 3306 | sg-emr-master | Allow EMR master group to access MySQL RDS 3306 - EMR external metadata store |
| sg-rds | RDS | Custom TCP | TCP | 3306 | sg-emr-slave | Allow EMR slave group to access MySQL RDS 3306 - EMR external metadata store |
| sg-rds | RDS | Custom TCP | TCP | 3306 | sg-emr-service | Allow EMR service group to access MySQL RDS 3306 - EMR external metadata store |
