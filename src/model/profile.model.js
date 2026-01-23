import { Dynamo } from "nicola-framework";

export default class Profile extends Dynamo.Model {
    static tableName = "devschema.profile";
}