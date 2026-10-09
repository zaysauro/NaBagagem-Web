import {query} from "./db";
import {privateFiles} from "./storage";
export async function cleanupDeletedObjects(){
 try{const jobs=await query("select * from app_private.pending_storage_deletions()");for(const job of jobs.rows){try{await privateFiles().delete(job.storage_path);await query("select app_private.complete_storage_deletion($1)",[job.id]);}catch{console.error("storage_cleanup_pending");}}}catch{console.error("storage_cleanup_unavailable");}
}
