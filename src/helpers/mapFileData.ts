import {
	IContactInfo,
	IEmployee,
	IEmploymentInfo,
} from "../models/employee.model.js";

export const mapFileDataToSchema = (data: any[]): IEmployee[] => {
	return data.map((item) => {
		const employmentInfo: IEmploymentInfo = {
			jobTitle: item["Job Title"],
			hireDate: new Date(item["Hire Date"]),
			employmentType: item["Employment Type"] || "Full-time",
			status: item["Status"] || "Active",
			manager: item["Manager ID"] ? item["Manager ID"] : undefined,
		};

		const contactInfo: IContactInfo = {
			homeAddress: item["Home Address"],
			personalPhoneNumber: item["Personal Phone Number"],
			workPhoneNumber: item["Work Phone Number"],
			personalEmail: item["Personal Email"],
			workEmail: item["Work Email"],
		};

		return {
			fullName: item["Full Name"],
			employeeId: item["Employee ID"],
			dateOfBirth: new Date(item["Date of Birth"]),
			gender: item["Gender"],
			nationality: item["Nationality"],
			photoUrl: item["Photo URL"],
			employmentInfo: employmentInfo,
			contactInfo: contactInfo,
			userAccount: item["User Account ID"]
				? item["User Account ID"]
				: undefined,
		} as IEmployee;
	});
};
