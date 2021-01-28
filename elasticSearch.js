const { Client } = require('@elastic/elasticsearch')
// const defaultItems = require('./default_shopping_items');
const csv = require('./csv_json');
const path = require("path");

const INDEX = 'spotify_top';

const host = process.env.DB_HOST || 'http://localhost:9200';
const secure = process.env.DB_SECURE || false;
const user = process.env.DB_USER || 'elastic';
const password = process.env.DB_PASSWORD || '';
const useSSL = process.env.DB_USE_SSL || false;
const SSLCert = process.env.DB_SSL_CERT || '';
console.log('db host: ', host, ', secure: ', secure, ', user: ', user, ', useSSL: ', useSSL, ', SSLCert: ', SSLCert);

let db_init = false;

let connectionInfo = {
  node: host
};

if ( secure === 'true' ) {
  connectionInfo.auth = {
    username: user,
    password: password
  }
}
if ( useSSL === 'true' ){
  connectionInfo.ssl = {
    ca: SSLCert,
    rejectUnauthorized: false
  }
}
// console.log('connection info: ', connectionInfo);
console.log("Created an elastic search client for host ", host);

const client = new Client(connectionInfo);
// if (host) {
//   console.log("Created an elastic search client for host ", host);
//   client = new Client({
//     node: host,
//     // maxRetries: 3,
//     // requestTimeout: 30000,
//     // sniffOnStart: true,
//   });
// } else {
//   console.log("Created an elastic search client for http://localhost:9200 ");
// } 

// client.ping(
//   {
//     // ping usually has a 3000ms timeout
//     requestTimeout: Infinity,
//     // undocumented params are appended to the query string
//     hello: "elasticsearch!",
//   },
//   function (error) {
//     if (error) {
//       console.log(error);
//       console.trace("Ping to elasticsearch cluster failed!");
//     } else {
//       console.log("Ping was successful!");
//     }
//   }
// );

// console.log('Elastic search client:', client);

const getAllItems = async () => {
  if ( db_init === false ) {
    await initDB();
  }

  console.log("get all items...");

  const { body } = await client.search(
    {
      index: INDEX,
      body: {
        query: {
          match_all: {},
        },
      },
      sort : "Continent:asc",
      // sort : ["Continent:asc", "Country:asc", "Rank: ask"],
      size: 100
    }
  );

  // console.log(" all items found: ", body);

  const allValues = body.hits.hits.map((hit) => {
    // console.log(hit);
    return { ...hit._source, id: hit._id};
  });
  console.log("all items:", allValues);

  return allValues;
};

const filterItems = async (item) => {
  console.log("filter items by '", item, "'");

  const { body } = await client.search(
    {
      index: INDEX,
      body: {
        query: {
          match: {
            itemName: item
          }
        },
      },
      // sort : "itemName:asc",
      // size: 100
    }
  );

  console.log(" all items found: ", body);

  const allValues = body.hits.hits.map((hit) => {
    // console.log(hit);
    return {
      id: hit._id,
      itemName: hit._source.itemName,
      itemQty: hit._source.itemQty,
    };
  });
  console.log("all items:", allValues);

  return allValues;
};

const existsItem = async ({Country, Continent, Rank}) => {
  // console.log("check if item for country ", Country, ', continent ', Continent, ', rank ', Rank, " exists.");

  const { body } = await client.search({
    index: INDEX,
    body: {
      query: {
        bool: {
          must: [
            { match: { Country: Country } },
            { match: { Continent :  Continent}},
            // { match: { Rank :  Rank}}
          ],
          filter: [{ match: { Rank: Rank } }],
        },
      },
    },
  });

  // console.log(" all items found count: ", body.hits.total.value);
  // console.log(" all items found: ", body.hits.hits);

  const found = body.hits.total.value > 0 || body.hits.hits.length > 0;
  console.log("item for country ", Country, ', continent ', Continent, ', rank ', Rank, " exists: ", found);

  return found;
};

const addItem = async (item) => {
  console.log("add item ", item);

  const {body} = await client.index({
    index: INDEX,
    body: { ...item },
    refresh: true
  });

  // console.log(body);
  console.log('new item: ', body._id);

};


const initDB = async () => {
  console.log("Init DB....");

  const defaultItems = await csv.parseCSVFile(path.join(__dirname, "SpotifyTopSongsByCountry - May 2020 copy.csv"));

  if (!defaultItems || defaultItems.length === 0) {
    console.log("No items to initialize database!");
    return;
  }

  //create index
  try {
    await client.indices.create({
      index: INDEX,
    });
  } catch (err) {
    console.log("failed to create the index. error: ", err);
  }

  let exists;
  try {
    for (item of defaultItems) {
      // console.log(item);
      exists = await existsItem(item);
      if (exists === false) {
        await addItem(item);
      }
    }
  } catch (err) {
    console.error("An error occured while initialize elastic search db: ", err);
  }

    //update meta
    try {
      await client.indices.putMapping({
        index: INDEX,
        body: {
          properties: {
            Continent: {
              type: "text",
              fielddata: true,
            },
            Country: {
              type: "text",
              fielddata: true,
            },
            // Rank: {
            //   type: "short",
            //   // fielddata: true,
            //   index: true
            // },
          },
        },
      });
    } catch (err) {
      console.log("failed to update the index. error: ", err);
    }

  db_init = true;
};

module.exports = {
    initDB,
    getAllItems,
    filterItems,
    existsItem,
    addItem
}

// (async () => {

// })();

// getAllItems();
// getItem('2');
// addItem('kiwis', 2);
// updateItem(2, 7);
// deleteItem('uL5MAXcBwiC_gzya--PE');
// deleteItem('ub5MAXcBwiC_gzya--Pp');
// deleteItem('ur5MAXcBwiC_gzya_OML');
// deleteItem(1);
// existsItem('apples');
initDB();
// filterItems('ana');
// filterItems('ba');
// filterItems('*ba*');
// filterItems('ba*');

async function run () {
  //  //delete index
  //  try {
  //   await client.indices.delete({
  //     index: 'game-of-thrones',
  //   });
  // } catch (err) {
  //   console.log("failed to delete the index. error: ", err);
  // }

  // // Let's start by indexing some data
  // await client.index({
  //   index: 'game-of-thrones',
  //   body: {
  //     character: 'Ned Stark',
  //     quote: 'Winter is coming.'
  //   }
  // })

  // await client.index({
  //   index: 'game-of-thrones',
  //   body: {
  //     character: 'Daenerys Targaryen',
  //     quote: 'I am the blood of the dragon.'
  //   }
  // })

  // await client.index({
  //   index: 'game-of-thrones',
  //   // here we are forcing an index refresh,
  //   // otherwise we will not get any result
  //   // in the consequent search
  //   refresh: true,
  //   body: {
  //     character: 'Tyrion Lannister',
  //     quote: 'A mind needs books like a sword needs a whetstone.'
  //   }
  // })

  // Let's search!
  // const { body } = await client.search({
  //   index: 'game-of-thrones',
  //   body: {
  //     query: {
  //       match: {
  //         quote: 'bloo'
  //         // character: 'Tyri'
  //       }
  //     }
  //   }
  // })

  const { body } = await client.search({
    index: 'game-of-thrones',
    body: {
      query: {
        "bool" : {
          "should": [
            { "term": { "quote": "blood" }}
          ]
        }
      }
    }
  })

  
  console.log(body.hits.total.value);
  console.log(body.hits.hits);

  // const { body } = await client.sql.query({
  //   body: {
  //     query: "SELECT * FROM \"game-of-thrones\" WHERE quote LIKE '%blo%'"
  //   }
  // })

  // console.log(body.columns);
  // console.log(body.rows);

}

// run().catch(console.log)
