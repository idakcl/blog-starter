import { describe, expect, it } from "vitest";

import { formRedirect, isFormPost, readJsonOrFormBody } from "../auth-form";

describe("isFormPost", () => {
  it("detects urlencoded form posts case-insensitively", () => {
    const request = new Request("http://localhost/login", {
      headers: { "content-type": "Application/X-WWW-Form-Urlencoded" },
      method: "POST",
    });
    expect(isFormPost(request)).toBe(true);
  });

  it("detects multipart form posts", () => {
    const request = new Request("http://localhost/login", {
      headers: { "content-type": "multipart/form-data; boundary=abc" },
      method: "POST",
    });
    expect(isFormPost(request)).toBe(true);
  });

  it("does not treat JSON as a form post", () => {
    const request = new Request("http://localhost/login", {
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    expect(isFormPost(request)).toBe(false);
  });
});

describe("readJsonOrFormBody", () => {
  it("reads JSON request bodies", async () => {
    const request = new Request("http://localhost/login", {
      body: JSON.stringify({ email: "user@example.com" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    await expect(readJsonOrFormBody(request)).resolves.toEqual({ email: "user@example.com" });
  });

  it("reads urlencoded form request bodies", async () => {
    const request = new Request("http://localhost/login", {
      body: new URLSearchParams({
        email: "user@example.com",
        password: "password123",
      }),
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    await expect(readJsonOrFormBody(request)).resolves.toEqual({
      email: "user@example.com",
      password: "password123",
    });
  });

  it("uses uploaded file names for file form values", async () => {
    const formData = new FormData();
    formData.set("avatar", new File(["content"], "avatar.png"));
    const request = new Request("http://localhost/login", {
      body: formData,
      method: "POST",
    });

    await expect(readJsonOrFormBody(request)).resolves.toEqual({ avatar: "avatar.png" });
  });
});

describe("formRedirect", () => {
  it("returns a 303 redirect by default", () => {
    const response = formRedirect("/admin");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves Set-Cookie headers", () => {
    const headers = new Headers();
    headers.append("set-cookie", "session=abc; Path=/; HttpOnly");
    const response = formRedirect("/admin", { headers });
    expect(response.headers.getSetCookie()).toEqual(["session=abc; Path=/; HttpOnly"]);
  });

  it("removes CRLF from redirect locations", () => {
    const response = formRedirect("/admin\r\nx-bad: yes");
    expect(response.headers.get("location")).toBe("/adminx-bad: yes");
  });
});
