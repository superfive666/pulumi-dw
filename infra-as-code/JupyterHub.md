## JupyterHub

https://jupyterhub.readthedocs.io/en/latest/index.html

jovyan/jupyter

```
sudo docker exec jupyterhub useradd -m -s /bin/bash -N user_a
sudo docker exec jupyterhub bash -c "echo user_a:password_a | chpasswd"
```

Configs:
```
[
    {
        "Classification": "jupyter-s3-conf",
        "Properties": {
            "s3.persistence.enabled": "true",
            "s3.persistence.bucket": "MyJupyterBackups"
        }
    }
]
```