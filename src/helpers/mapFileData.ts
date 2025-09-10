import { IEmployee } from "../models/employee.model.js";

interface IFlatFileData {
	[key: string]: any;
}

const headerMap: { [key: string]: keyof IEmployee | string } = {
	"Full Name": "fullName",
	"Employee ID": "employeeId",
	"Date of Birth": "dateOfBirth",
	Gender: "gender",
	Nationality: "nationality",
	"Photo URL": "photoUrl",
	"Job Title": "employmentInfo.jobTitle",
	"Manager ID": "employmentInfo.manager",
	Department: "employmentInfo.department",
	"Hire Date": "employmentInfo.hireDate",
	"Employment Type": "employmentInfo.employmentType",
	Status: "employmentInfo.status",
	"Termination Date": "employmentInfo.terminationDate",
	"Home Address": "contactInfo.homeAddress",
	"Personal Phone Number": "contactInfo.personalPhoneNumber",
	"Work Phone Number": "contactInfo.workPhoneNumber",
	"Personal Email": "contactInfo.personalEmail",
	"Work Email": "contactInfo.workEmail",
	"User Account ID": "userAccount",
};

export const mapFileDataToSchema = (data: IFlatFileData[]): IEmployee[] => {
	return data.map((item) => {
		const mappedEmployee: any = {};
		const employmentInfo: any = {};
		const contactInfo: any = {};

		for (const header in item) {
			const schemaPath = headerMap[header];

			if (typeof schemaPath === "string") {
				const [topLevelKey, nestedKey] = schemaPath.split(".");

				let value = item[header];

				if (
					value === null ||
					value === undefined ||
					value === "" ||
					(typeof value === "object" && !Array.isArray(value))
				) {
					value = undefined;
				} else {
					value = String(value).trim();
				}

				if (nestedKey) {
					if (topLevelKey === "employmentInfo") {
						employmentInfo[nestedKey] = value;
					} else if (topLevelKey === "contactInfo") {
						contactInfo[nestedKey] = value;
					}
				} else if (topLevelKey) {
					mappedEmployee[topLevelKey] = value;
				}
			}
		}

		mappedEmployee.dateOfBirth = mappedEmployee.dateOfBirth
			? new Date(mappedEmployee.dateOfBirth)
			: undefined;

		mappedEmployee.employmentInfo = {
			...employmentInfo,
			hireDate: employmentInfo.hireDate
				? new Date(employmentInfo.hireDate)
				: undefined,
			employmentType: employmentInfo.employmentType || "Full-time",
			status: employmentInfo.status || "Active",
			terminationDate: employmentInfo.terminationDate
				? new Date(employmentInfo.terminationDate)
				: undefined,
		};

		mappedEmployee.contactInfo = contactInfo;

		return mappedEmployee as IEmployee;
	});
};
