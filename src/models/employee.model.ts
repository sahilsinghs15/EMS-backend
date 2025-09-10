import { Schema, model, Document, Types } from "mongoose";

export interface IContactInfo {
	homeAddress?: string;
	personalPhoneNumber?: string;
	workPhoneNumber?: string;
	personalEmail?: string;
	workEmail: string;
}

export interface IEmploymentInfo {
	jobTitle: string;
	manager?: Types.ObjectId;
	department: "Web-Dev" | "Mobile-Dev" | "Data-Analyst" | "HR";
	hireDate: Date;
	employmentType?: "Full-time" | "Part-time" | "Contract" | "Intern";
	status?: "Active" | "On Leave" | "Terminated";
	terminationDate?: Date;
}

export interface IEmployee extends Document {
	fullName: string;
	employeeId: string;
	dateOfBirth: Date;
	gender?: "Male" | "Female" | "Other";
	nationality?: string;
	photoUrl?: string;
	employmentInfo: IEmploymentInfo;
	contactInfo: IContactInfo;
	userAccount?: Types.ObjectId;
}

const employeeSchema = new Schema<IEmployee>(
	{
		fullName: {
			type: String,
			required: true,
			trim: true,
		},
		employeeId: {
			type: String,
			required: true,
			unique: true,
			trim: true,
		},
		dateOfBirth: {
			type: Date,
			required: true,
		},
		gender: {
			type: String,
			enum: ["Male", "Female", "Other"],
		},
		nationality: {
			type: String,
			trim: true,
		},
		photoUrl: {
			type: String,
			trim: true,
		},
		employmentInfo: {
			jobTitle: {
				type: String,
				required: true,
				trim: true,
			},
			manager: {
				type: Schema.Types.ObjectId,
				ref: "Employee",
			},
			department: {
				type: String,
				enum: ["Web-Dev", "Mobile-Dev", "Data-Analyst", "HR"],
			},
			hireDate: {
				type: Date,
				required: true,
			},
			employmentType: {
				type: String,
				enum: ["Full-time", "Part-time", "Contract", "Intern"],
			},
			status: {
				type: String,
				enum: ["Active", "On Leave", "Terminated"],
				default: "Active",
			},
			terminationDate: {
				type: Date,
			},
		},
		contactInfo: {
			homeAddress: {
				type: String,
				trim: true,
			},
			personalPhoneNumber: {
				type: String,
				trim: true,
			},
			workPhoneNumber: {
				type: String,
				unique: true,
				sparse: true,
				trim: true,
			},
			personalEmail: {
				type: String,
				trim: true,
			},
			workEmail: {
				type: String,
				required: true,
				unique: true,
				trim: true,
			},
		},
		userAccount: {
			type: Schema.Types.ObjectId,
			ref: "UserAccount",
		},
	},
	{ timestamps: true }
);

export const Employee = model<IEmployee>("Employee", employeeSchema);
