## HIVE

Hive

Hive external metastore config

```
{
  Classification: 'hive-site',
  Properties: {
    'javax.jdo.option.ConnectionURL': pulumi.interpolate`jdbc:mysql://${rds.endpoint}/hive?createDatabaseIfNotExist=true`,
    'javax.jdo.option.ConnectionDriverName': 'org.mariadb.jdbc.Driver',
    'javax.jdo.option.ConnectionUserName': 'root',
    'javax.jdo.option.ConnectionPassword': password,
    'hive.blobstore.use.output-committer': 'true'
  }
}
```