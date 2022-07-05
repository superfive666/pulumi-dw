## PRESTO

Presto Instruction:

```
cd ~
wget https://repo1.maven.org/maven2/com/facebook/presto/presto-cli/0.273.3/presto-cli-0.273.3-executable.jar
mv presto-cli-0.273.3-executable.jar presto
chmod +x presto

# try 
./presto --server localhost:8889 --catalog hive --schema default

# config
[
   {
      "Classification":"prestosql-config",
      "Properties":{
         "http-server.authentication.type":"PASSWORD"
      }
   },
   {
      "Classification":"prestosql-password-authenticator",
      "Properties":{
         "password-authenticator.name":"ldap",
         "ldap.url":"ldaps://bitdeer-inc.com:636",
         "ldap.group-auth-pattern": "(&(objectclass=organizationalPerson)(sAMAccountName=ITDSAMPTBL)(memberof=OU=Server Accouts,OU=ITADMIN,DC=bitdeer-inc,DC=com))"
      }
   }
]

```

config location
/etc/presto/conf/
/usr/lib/presto/etc/password-authenticator.properties

