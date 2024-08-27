export function vtlSerializer(body: object, keys: string[] = []) {
  let json = JSON.stringify(body, (key, value) => {
    if (keys.includes(key)) {
      // remove all tabs, newlines and spaces from value using regex
      value = value[0].replace(/[\n\t]/g, "");
      return [`#REPLACE# ${value} #REPLACE#`];
    }
    return value;
  });

  // Use regex to remove all occurrences of #REPLACE# markers
  json = json.replace(/"#REPLACE# | #REPLACE#"/g, "").replace(/\\/g, "");

  return json;
}
