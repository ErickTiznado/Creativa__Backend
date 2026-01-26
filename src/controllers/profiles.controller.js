import { Profile } from "../model/profile.model.js";

const getDesigners = async (req, res) => {
  try {
    const response = await Profile.where("role", "designer").get();

    res.statusCode = 200;
    res.json(response);
  } catch (error) {
    console.log(error);
    res.statusCode = 500;
    res.end(error);
  }
};

export { getDesigners };
