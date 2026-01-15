import {Nicola,  Regulator } from "nicola-framework";
import ChatRoutes from "./routes/chatRoutes.js"

Regulator.load()

const app = new Nicola()

app.use('/ai', ChatRoutes)

app.listen(3000, () =>{
    console.log('Servidor corriendo en el puerto 3000')
})