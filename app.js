import Nicola, { Regulator } from "nicola-framework";
import chatRoutes from "./src/routes/chatRoutes.js";

Regulator.load()

const app = new Nicola()
app.use('/ai', chatRoutes)

app.listen(3000, () =>{
    console.log('Servidor corriendo en el puerto 3000')
})