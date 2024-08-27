import { vtlSerializer } from "../lib/util";

test("SQS Queue Created", () => {
  const body = {
    L: [
      `
                    #foreach($permission in $input.path('$.permissions'))
                      {
                        "M": {
                          "Username": {"S": "$permission.username"},
                          "Actions": {"S": "$permission.actions"}
                        }
                      }
                        #if($foreach.hasNext),#end
                    `,
    ],
  };

  const vtl = vtlSerializer(body, ["L"]);
  console.log({ vtl });
  expect(vtl.includes('["') || vtl.includes('"]')).toBe(false);
});
