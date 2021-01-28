const { Client } = require('@elastic/elasticsearch')
// const defaultItems = require('./default_shopping_items');
const csv = require('./csv_json');
const path = require("path");

const INDEX = 'spotify_top';
const RECREATE_INDEX = false;

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
      // sort : "year:asc",
      sort : ["year:asc", "idx:asc"],
      size: 1000
    }
  );

  // console.log(" all items found: ", body);

  const allValues = body.hits.hits.map((hit) => {
    // console.log(hit);
    return { ...hit._source, id: hit._id};
  });
  // console.log("all items:", allValues);
  console.log("all items:", allValues.length);

  return allValues;
};

const filterItems = async (info, year) => {
  console.log("filter items by info '", info, "' and year ", year);

  let qBody = {
    query: {
      bool: {},
    },
  };

  if (info) {
    qBody.query.bool.should = [
      {
        match: {
          // artist: {
          //   query: info,
          //   operator: 'OR'
          // }
          artist: info,
        },
      },
      {
        match: {
          title: {
            query: info,
            operator: 'AND'
          }
          // title: info,
        },
      },
      {
        match: {
          // "top genre": {
          //   query: info,
          //   operator: 'OR'
          // }
          "top genre": info,
        },
      },
      // {
      //   multi_match: {
      //     query: info,
      //     fields: ["artist", "title", "top genre"],
      //   },
      // },
    ];

    qBody.query.bool.minimum_should_match= 1;
  }

  if (year) {
    qBody.query.bool.filter = {
      match: {
        year: year,
      },
    };
  }

  // console.log('query body:', qBody);
  // console.log('query body bool:', qBody.query.bool);
  console.log('query body bool should:', qBody.query.bool.should);
  console.log('query body bool filter:', qBody.query.bool.filter);

  const { body } = await client.search({
    index: INDEX,
    body: qBody,
    // default_operator: 'OR',
    // sort : "year:asc",
    sort: ["year:asc", "idx:asc"],
    size: 1000,
  });

  // console.log(" all items found: ", body);

  const allValues = body.hits.hits.map((hit) => {
    // console.log(hit);
    return { ...hit._source, id: hit._id};
  });
  // console.log("all items:", allValues);
  console.log("filtered items:", allValues.length);

  return allValues;
};


const existsItem = async (item) => {
  const {idx, year} = item;
  // console.log("check if item ", idx, ', year ', year, " exists.");

  const { body } = await client.search({
    index: INDEX,
    body: {
      query: {
        bool: {
          must: [
            { match: { year: year } },
            { match: { idx: idx } },
          ],
          // filter: [{ match: { idx: idx } }],
        },
      },
    },
  });

  // console.log(" all items found count: ", body.hits.total.value);
  // console.log(" all items found: ", body.hits.hits);

  const found = body.hits.total.value > 0 || body.hits.hits.length > 0;
  console.log("item ", idx, ', year ', year, " exists: ", found);

  return found;
};

const addItem = async (item) => {
  // console.log("add item ", item);

  const {body} = await client.index({
    index: INDEX,
    body: { ...item },
    refresh: true
  });

  // console.log(body);
  // console.log('new item: ', body._id);

};


const initDB = async () => {
  console.log("Init DB....");

  const defaultItems = await csv.parseCSVFile(
    path.join(__dirname, "data", "top10s.csv")
  );

  if (!defaultItems || defaultItems.length === 0) {
    console.log("No items to initialize database!");
    return;
  }

  //create index
  if ( RECREATE_INDEX === true ) {
    try {
      await client.indices.delete({
        index: INDEX
      });
    } catch (err) {
      console.log("failed to delete the index. error: ", err);
    }
  }

  //create index
  try {
    await client.indices.create({
      index: INDEX,
      body: {
        mappings: {
          numeric_detection: true,
        },
      },
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
// initDB();
// filterItems('ana');
// filterItems('ba');
// filterItems('*ba*');
// filterItems('ba*');

