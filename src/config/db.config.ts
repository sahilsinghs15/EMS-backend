import mongoose from "mongoose";

mongoose.set('strictQuery' , false);
const connectionToDb = async()=>{

    try{
        const {connection} = await mongoose.connect(process.env.MONGO_URI || "");
    
        if(connection){
            console.log("Database successfully connected on the" , connection.host);
        }
    }catch(e){
        console.log(e);
        process.exit(1);
    }
    
}

export default connectionToDb;