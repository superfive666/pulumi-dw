## EMR

EMR High availability:

https://docs.amazonaws.cn/en_us/emr/latest/ManagementGuide/emr-plan-ha-applications.html

https://docs.amazonaws.cn/en_us/emr/latest/ReleaseGuide/emr-release-components.html

```
# check active and standby master
hdfs haadmin -getAllServiceState

# check active service list
sudo systemctl --type=service
```

EMR Application List:

Hadoop

[Hive](Hive.md)

[Presto](Presto.md)

Spark

Livy

Zookeeper

JupyterHub

Airflow

Tableau

Apache Ranger:
https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ranger-begin.html
