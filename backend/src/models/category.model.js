import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    category_name : {
        type : String
    },
    category_image : {
        type : String
    },
    // Marks built-in categories that the app itself depends on (today only
    // 'other', the fallback every deleted category's products move to).
    // Left unset on ordinary categories, so existing documents need no
    // migration.
    systemKey : {
        type : String,
        default : undefined
    }
},{
    timestamps : true
})

// Partial so the many documents without a systemKey never collide on null.
// This index is what makes "create Other" race-safe: two concurrent first
// uses can never both insert it. There is deliberately no unique index on the
// name: existing data may already hold duplicates or padded names.
categorySchema.index(
    { systemKey : 1 },
    { unique : true, partialFilterExpression : { systemKey : { $type : 'string' } } }
)

const CategoryModel = mongoose.model('category',categorySchema)

export default CategoryModel
