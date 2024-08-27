import { createNote, createPermissions, login, signup } from "./actions";

describe("Adding permissions", () => {
  test("Hugie signs up, logs in, creates a note, and adds permissions", async () => {
    // await signup("hugie", "hugie@email.com", "password");
    const token = await login("hugie", "password");

    // const note = await createNote(
    //   "first_note_test",
    //   "too many times have I wondered how ...",
    //   token
    // );
    const permissions = await createPermissions(
      "first_note_test",
      [
        {
          username: "annie",
          actions: "",
        },
      ],
      token
    );

    expect(permissions).toBe("OK");
  });
});
