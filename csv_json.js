const fs = require("fs");
const path = require("path");
const csvtojson = require("csvtojson");

const parseOptions = {
  // delimiter: ';',
  // includeColumns: /Country|Continent|Rank|Title|Artists/,
  includeColumns: /idx|title|artist|top genre|year/,
  trim: true,
  // checkType: true,
}

const parseCSVFile = async (filePath) => {
  console.log("Parse CSV file ", filePath);

  let fileContent = fs.readFileSync(filePath);

  return parseCSVString(fileContent);
};

const parseCSVString = async (fileContent) => {
  console.log("Parse CSV string");
  // console.log("File content: ");
  // console.log(fileContent);

  let csv = fileContent.toString();
  // console.log(csv);

  const parser = csvtojson(parseOptions);

  // Use the readable stream api
  // parser.on("header", (header) => {
  //   console.log('Header event: ', header);
  // });

  // parser.on("data", (data) => {
  //   console.log('Data event: ');
  //   console.log(data.toString());
  // });

  // // Catch any error or that processing is done
  // parser.on("done",  (err) => {
  //   console.error('Done event - error: ', err);
  // });

  // Catch any error
  parser.on("error",  (err) => {
    console.error('Error event: ', err);
  });

  parser.preFileLine( (fileLineString, lineIdx) => {
    // console.error('Line: ', lineIdx, 'Line: ', fileLineString);
    if (fileLineString.endsWith(parseOptions.delimiter)){
        // remove the delimiter at the end of each line
        return fileLineString.substring(0,fileLineString.length-parseOptions.delimiter.length);
    }
    return fileLineString;
  });

  const rows= await parser.fromString(csv);

  // console.log('CSV parse returned: ', rows);
  console.log('CSV parse returned results count: ', rows.length);
  if (rows.length > 0) {
    console.log("CSV parse returned first row: ", rows[0]);
    console.log("CSV parse returned last row: ", rows[rows.length - 1]);
  }

  return rows;
};

module.exports = { parseCSVFile, parseCSVString };

const testParseFile = async (file) => {
  
  const records = await parseCSVFile(file);
  console.log('============== Results==============');
  // console.log(records.length > 0 ? records[records.length-1] : 'No record');
  // console.log(records);
  console.log('============== Results count: ', records.length);
}

const testParseStream = async () => {
    const input = `"key_1","key_2"
    "value 1.1","value 1.2"
    "value 2.1",value"2".2
    "value 3.1","value 3.2"
    "value 4.1","value 4.2"
    `;

    const records = await parseCSVString(input);
    console.log('============== Results:');
    console.log(records);
}

// testParseFile(path.join(__dirname, 'SpotifyTopSongsByCountry - May 2020.csv'));
// testParseFile(path.join(__dirname, 'SpotifyTopSongsByCountry - May 2020 copy.csv'));
// testParseFile(path.join(__dirname, 'top10s.csv'));
// testParseStream();


