#! /bin/sh

grep -lR "#translation/" ./src/server/translation | xargs sed -i 's/\#translation\//\.\//'
