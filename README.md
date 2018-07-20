# snomed-release-check

Check release for SNOMED CT releases with an extension

## Requirements

* MySQL database, tested with 5.7.2 community edition
* NodeJS, tested with 5.2.0

## Install

Clone repository. Run script in folder scripts to load SNOMED CT + extension

```
./make_mysql_full.sh <path to International release folder> <path to extension release folder>
```

Run web app with NodeJS.

```
node app.js
```

