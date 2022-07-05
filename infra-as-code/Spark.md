## Spark

spark configs refer




Common
```
sudo systemctl stop hadoop-yarn-resourcemanager  
sudo systemctl start hadoop-yarn-resourcemanager
```

get current spark session configs
```python
configurations = spark.sparkContext.getConf().getAll()
for item in configurations: print(item)
```