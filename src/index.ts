import { log } from 'console';
import fs from 'fs';
import { forEach, map, uniqBy } from "rambda";



const headers = {
  'Accept': 'image/avif,image/webp,*/*',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://neal.fun/infinite-craft/',
  'Alt-Used': 'neal.fun',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'image',
  'Sec-Fetch-Mode': 'no-cors',
  'Sec-Fetch-Site': 'same-origin',
  'DNT': '1',
  'Sec-GPC': '1'
};

const craft = async (first: string, second: string) => {
  const res = await fetch(`https://neal.fun/api/infinite-craft/pair?first=${first}&second=${second}`, { headers: headers })
  const json = await res.json() as { result: string, emoji: string, isNew: boolean }
  return { text: json.result, emoji: json.emoji, discovered: false }
}

type DiscoveredPairs = { first: string, second: string, result: string, resultEmoji: string }[]
const discoveredPairs: DiscoveredPairs = []

const getGeneration = async (gen: number) => {
  const gen0 = fs.readFileSync(`data/gen${gen}.json`, 'utf8')
  const elements = JSON.parse(gen0) as { text: string, emoji: string, discovered: boolean }[]

  const gen0Tree = fs.readFileSync(`data/gen${gen}_tree.json`, 'utf8')
  const discoveredPairs = JSON.parse(gen0Tree) as DiscoveredPairs

  // construct iteration list over all pairs, but only the lower triangle
  const pairsToCheck = map((first) => map((second) => ({ first: first.text, second: second.text }), elements), elements)
    .flat()
    .reduce((acc, pair) => {
      // check if opposite pair already exists
      const exists = acc.find((p) => p.first === pair.second && p.second === pair.first) !== undefined
      if (!exists) {
        return [...acc, pair]
      }
      return acc
    }, [] as { first: string, second: string }[])

  let i = 0
  for await (const pair of pairsToCheck) {
    i++
    const exitst = discoveredPairs.find((p) => p.first === pair.first && p.second === pair.second) !== undefined
    // log progress
    process.stdout.write(`${i}/${pairsToCheck.length}: `)
    if (exitst) {
      process.stdout.write(`${pair.first} + ${pair.second} already discovered\n`)
      continue
    }

    // set random timeout to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 1000))
    const firstEmoji = elements.find((e) => e.text === pair.first)?.emoji || ''
    const secondEmoji = elements.find((e) => e.text === pair.second)?.emoji || ''
    process.stdout.write(`${pair.first} ${firstEmoji} + ${pair.second} ${secondEmoji} = `)
    const newItem = await craft(pair.first, pair.second)
    process.stdout.write(`${newItem.text} ${newItem.emoji}\n`)


    fs.appendFileSync(`crafting_log.txt`, `${pair.first} ${firstEmoji} + ${pair.second} ${secondEmoji} = ${newItem.text} ${newItem.emoji}\n`)

    elements.push(newItem)
    discoveredPairs.push({ first: pair.first, second: pair.second, result: newItem.text, resultEmoji: newItem.emoji })
  }

  // clean up duplicates, compare by text
  const uniqueElements = uniqBy((e) => e.text, elements)

  console.log('unique elements', uniqueElements.length)
  fs.writeFileSync(`data/gen${gen + 1}.json`, JSON.stringify(uniqueElements, null, 2))
  fs.writeFileSync(`data/gen${gen + 1}_tree.json`, JSON.stringify(discoveredPairs, null, 2))

  logGenItems(gen + 1)

  console.log('done')
  process.exit(0)
}




const logGenItems = (gen: number) => {
  // log items
  const gen0 = fs.readFileSync(`data/gen${gen}.json`, 'utf8')
  const elements = JSON.parse(gen0) as { text: string, emoji: string, discovered: boolean }[]
  let genItems = ''
  forEach((e) => {
    genItems += `${e.text} ${e.emoji}\n`
  }, elements)
  fs.writeFileSync(`data_hr/gen${gen}_items.txt`, genItems)


  // log crafts
  const gen0Tree = fs.readFileSync(`data/gen${gen}_tree.json`, 'utf8')
  const discoveredPairs = JSON.parse(gen0Tree) as DiscoveredPairs
  let genCrafts = ''
  forEach((p) => {
    const firstEmoji = elements.find((e) => e.text === p.first)?.emoji || ''
    const secondEmoji = elements.find((e) => e.text === p.second)?.emoji || ''
    genCrafts += `${p.first} ${firstEmoji} + ${p.second} ${secondEmoji} = ${p.result} ${p.resultEmoji}\n`

  }, discoveredPairs)
  fs.writeFileSync(`data_hr/gen${gen}_crafts.txt`, genCrafts)
}


const main = async () => {
  const gen = Number(process.argv[2]) || 0
  console.log('Start fetching generation ', gen)
  await getGeneration(gen)
}


void main()
