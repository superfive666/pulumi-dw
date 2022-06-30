# AWS Pulumi

## General Information

Before your begin using the `pulumi`, run the following command on your MacOS to install `pulumi`:

```
brew install pulumi/tap/pulumi
```

This project uses typescript for formalising the infrastructure, install the required dependencies using `HomeBrew`:

```
brew install npm node

npm --version

node --version
```

For language specific linting, the following packages are optional:

```
npm install -g eslint typescript prettier
```

This project was initialized using the following commands (there will be interactive steps for initializing projects)

```
pulumi new aws-typescript
```

For more details on `pulumi` integration with the `AWS` resources, refer to [API Docs](https://www.pulumi.com/registry/packages/aws/api-docs/).

## Setup AWS CLI

For installing AWS CLI for the first time on your MacOS:

```
# download the install pkg into your user home directory
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "~/AWSCLIV2.pkg"

sudo installer -pkg AWSCLIV2.pkg -target /

# verify your installation of the aws-cli
which aws

aws --version
```

For setting up AWS CLI, first import the relevant certificate file (company zscaler SSL):

```
-----BEGIN CERTIFICATE-----
MIIE0zCCA7ugAwIBAgIJANu+mC2Jt3uTMA0GCSqGSIb3DQEBCwUAMIGhMQswCQYD
VQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTERMA8GA1UEBxMIU2FuIEpvc2Ux
FTATBgNVBAoTDFpzY2FsZXIgSW5jLjEVMBMGA1UECxMMWnNjYWxlciBJbmMuMRgw
FgYDVQQDEw9ac2NhbGVyIFJvb3QgQ0ExIjAgBgkqhkiG9w0BCQEWE3N1cHBvcnRA
enNjYWxlci5jb20wHhcNMTQxMjE5MDAyNzU1WhcNNDIwNTA2MDAyNzU1WjCBoTEL
MAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExETAPBgNVBAcTCFNhbiBK
b3NlMRUwEwYDVQQKEwxac2NhbGVyIEluYy4xFTATBgNVBAsTDFpzY2FsZXIgSW5j
LjEYMBYGA1UEAxMPWnNjYWxlciBSb290IENBMSIwIAYJKoZIhvcNAQkBFhNzdXBw
b3J0QHpzY2FsZXIuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA
qT7STSxZRTgEFFf6doHajSc1vk5jmzmM6BWuOo044EsaTc9eVEV/HjH/1DWzZtcr
fTj+ni205apMTlKBW3UYR+lyLHQ9FoZiDXYXK8poKSV5+Tm0Vls/5Kb8mkhVVqv7
LgYEmvEY7HPY+i1nEGZCa46ZXCOohJ0mBEtB9JVlpDIO+nN0hUMAYYdZ1KZWCMNf
5J/aTZiShsorN2A38iSOhdd+mcRM4iNL3gsLu99XhKnRqKoHeH83lVdfu1XBeoQz
z5V6gA3kbRvhDwoIlTBeMa5l4yRdJAfdpkbFzqiwSgNdhbxTHnYYorDzKfr2rEFM
dsMU0DHdeAZf711+1CunuQIDAQABo4IBCjCCAQYwHQYDVR0OBBYEFLm33UrNww4M
hp1d3+wcBGnFTpjfMIHWBgNVHSMEgc4wgcuAFLm33UrNww4Mhp1d3+wcBGnFTpjf
oYGnpIGkMIGhMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTERMA8G
A1UEBxMIU2FuIEpvc2UxFTATBgNVBAoTDFpzY2FsZXIgSW5jLjEVMBMGA1UECxMM
WnNjYWxlciBJbmMuMRgwFgYDVQQDEw9ac2NhbGVyIFJvb3QgQ0ExIjAgBgkqhkiG
9w0BCQEWE3N1cHBvcnRAenNjYWxlci5jb22CCQDbvpgtibd7kzAMBgNVHRMEBTAD
AQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAw0NdJh8w3NsJu4KHuVZUrmZgIohnTm0j+
RTmYQ9IKA/pvxAcA6K1i/LO+Bt+tCX+C0yxqB8qzuo+4vAzoY5JEBhyhBhf1uK+P
/WVWFZN/+hTgpSbZgzUEnWQG2gOVd24msex+0Sr7hyr9vn6OueH+jj+vCMiAm5+u
kd7lLvJsBu3AO3jGWVLyPkS3i6Gf+rwAp1OsRrv3WnbkYcFf9xjuaf4z0hRCrLN2
xFNjavxrHmsH8jPHVvgc1VD0Opja0l/BRVauTrUaoW6tE+wFG5rEcPGS80jjHK4S
pB5iDj2mUZH1T8lzYtuZy0ZPirxmtsk3135+CKNa2OCAhhFjE0xd
-----END CERTIFICATE-----
```

Save the content above into a file `bitdeer.pem` and put under your root folder. Then configure the ca bundle in the `~/.aws/config`:

```
[default]
region = ap-southeast-1
ca_bundle = /Users/chao.wu/bitdeer.pem

[profile mpdw-dev]
region = us-west-2
ca_bundle = /Users/chao.wu/bitdeer.pem

[profile mpdw-sit]
region = us-west-2
ca_bundle = /Users/chao.wu/bitdeer.pem

# more profiles below
```

Update the AWS CLI credential in the following file `~/.aws/credentials`:

```
[default]
aws_access_key_id = <your aws access key here>
aws_secret_access_key = <your aws access secret here>

[mpdw-dev]
aws_access_key_id = <your aws access key here>
aws_secret_access_key = <your aws access secret here>

[mpdw-sit]
aws_access_key_id = <your aws access key here>
aws_secret_access_key = <your aws access secret here>
```

Once all the above has been setup properly, restart your terminal or shell for the configuration to take effect.

## Deployment Steps

To automate the deployment, you will need to do the following step:

```
# clone the project into your designated directory:
git clone git@gitlab.bitdeer.vip:minerplus-daplat/aws-pulumi.git

# make sure you have done the necessary installation and configuration
npm i

# use the command line interactive prompt to setup your own pulumi account for managing aws related resources
# follow the prompts to setup and login to your pulumi account
# npm run pulumi:init:dev 
npm run pulumi:init:sit 

# now you are ready to deploy aws resources using the predefined scripts
```

Before doing deployment, the SSH private key (`app-mpdw-keypairs-sit.pem`) need to be pre-generated and stored onto the jump server for developer access:

```
# Run the following command:
npm run generate:key:sit

# The output of the command will generate 2 files at the project root directory:
# IMPORTANT: please do not commit the output into git remote
# 1. app-mpdw-keypairs-sit-info.json
# 2. app-mpdw-keyparis-sit.pem
# The first is the json format file that contains all information (such as keyId, fingerprint etc) of the key-pair
# The second is the private key file for ssh into all stacks (emr, ec2) instances in the environment
# keep with care
```

Run the following commands for deployment:

```
# note: this command needs to be executed in the root directory of this repository
npm run pulumi:deploy:sit

# follow the interactive prompts for deployment
```

After interactive deployment completed, use the following commands to be able to connect to the `Tableau` instance:

```
npm run connect:ec2:dev
```

The following steps are for cleaning up of the entire set of resources:

```
npm run pulumi:destroy:sit

# follow the interactive prompts for cleanup process
```

For more available pre-defined scripts, please refer to the `package.json` file.
