import { getNote, login, signup } from "./actions";

describe("A user can access notes", () => {
  test("Annie can access Hugie's note", async () => {
    // await signup("annie", "annie@email.com", "password");
    const token = await login("annie", "password");
    const note = await getNote("first_note_test", "hugie", token);

    expect(note).toBeDefined();
  });
});
