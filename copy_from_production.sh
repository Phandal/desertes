#! /bin/sh

sed --version > /dev/null 2>&1
gnused=$#

if [[ $gnused -eq 0 ]]; then
  grep -lR "#translation/" ./src/server/translation | xargs sed -i 's/\#translation\//\.\//'
  sed -i "/\/logger\.js\|new Logger/d" src/server/translation/util.ts
  sed -i "s/logger.debug/console.log/" src/server/translation/util.ts
else
  grep -lR "#translation/" ./src/server/translation | xargs sed -i '' 's/\#translation\//\.\//'
  sed -Ei '' "/\/logger\.js|new Logger/d" src/server/translation/util.ts
  sed -i '' "s/logger.debug/console.log/" src/server/translation/util.ts
fi
