install:
  npm install

build:
  npx tsc

# generation: the number of the generation
run generation: build
  node ./dist/index.js {{generation}}
