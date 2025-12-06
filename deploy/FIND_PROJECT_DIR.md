# Знаходження директорії проекту на сервері

Якщо скрипт не знаходить проект, виконайте на сервері:

```bash
# Знайти docker-compose файли
find /root /opt /var/www -name "docker-compose*.yml" -type f 2>/dev/null

# Або знайти директорію з admin-panel-backend
find /root /opt /var/www -type d -name "admin-panel-backend" 2>/dev/null

# Перевірити поточну директорію
pwd
ls -la

# Перевірити де знаходиться docker-compose
which docker-compose
docker-compose ps
```

Після знаходження правильного шляху, оновіть скрипт або виконайте команди вручну.

