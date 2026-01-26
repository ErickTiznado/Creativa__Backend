import { Dynamo } from "nicola-framework";

export class Profile extends Dynamo.Model {
  static tableName = "devschema.profile";
}
