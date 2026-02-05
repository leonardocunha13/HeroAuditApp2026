"use server";

import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import {Client} from "../@types/types";



Amplify.configure(outputs);
const client = generateClient<Schema>({
  authMode: "apiKey", // matches your backend
});
export async function GetClients() {
  try {
    const allClients: Client[] = [];
    let nextToken: string | undefined;

    do {
      const {
        data: clientsPage,
        nextToken: newNextToken,
        errors,
      }: {
        data: Client[];
        nextToken?: string | null;
        errors?: unknown;
      } = await client.models.Client.list({ nextToken });

      if (errors || !clientsPage) {
        console.error("Error fetching clients:", errors);
        throw new Error("Failed to fetch clients.");
      }

      allClients.push(...clientsPage);
      nextToken = newNextToken ?? undefined;
    } while (nextToken);

    return allClients.map((c) => ({
      id: c.id ?? "",
      name: c.ClientName ?? "",
      code: c.ClientCode ?? "",
    }));
  } catch (error) {
    console.error("Error in GetClients:", error);
    throw error;
  }
}


export async function GetFormById(id: string) {
  try {
    const { data: form, errors } = await client.models.Form.get({ id });

    if (errors) {
      console.error(errors);
      return null;
    }

    if (!form) {
      throw new Error("Form not found.");
    }

    // Get client name using clientID
    let clientName = null;
    if (form.clientID) {
      const { data: clientData, errors: clientErrors } = await client.models.Client.get({
        id: form.clientID,
      });

      if (clientErrors) {
        console.error(clientErrors);
      }

      if (clientData) {
        clientName = clientData.ClientName;
      }
    }


    if (form.formProjects) {
      const formProjectsResult = await form.formProjects();
      const formProject = formProjectsResult.data?.[0];

      if (formProject?.projectID) {
        const { errors: projectErrors } = await client.models.Project.get({
          id: formProject.projectID,
        });

        if (projectErrors) {
          console.error(projectErrors);
        }

      }
    }

    return {
      form,
      equipmentName: form.equipmentName ?? null,
      clientName,
      shareURL: form.shareURL,
      visits: form.visits ?? 0,
      submissions: form.submissions ?? 0,
      FormDescription: form.description,
      revision: form.revision ?? 0,
      content: form.content,
    };
  } catch (error) {
    console.error("Error fetching form by ID:", error);
    return null;
  }
}

export async function UpdateFormContent(id: string, content: any) {
  try {
    const form = {
      id,
      content,
    };

    const { data: updatedForm, errors } = await client.models.Form.update(form);

    if (errors) {
      console.error(errors);
      throw new Error("Failed to update form content.");
    }

    return updatedForm;
  } catch (error) {
    console.error("Error updating form content:", error);
    throw new Error("Failed to update form content.");
  }
}

// Define your server-side action
export async function saveFormAction(formData: FormData) {
  const id = formData.get("id") as string;
  const content = formData.get("content") as string;

  // Call your existing server-side function (UpdateFormContent)
  await UpdateFormContent(id, content);
}

export async function PublishForm(userId: string, id: string, content: string, shareURL: string) {
  try {
    const { data: currentForm, errors: fetchErrors } = await client.models.Form.get({ id });

    if (fetchErrors || !currentForm) {
      console.error(fetchErrors);
      throw new Error("Failed to fetch current form.");
    }
    const isFirstPublish = !currentForm.firstPublishedAt;
    const newRevision = isFirstPublish ? 0 : (currentForm.revision ?? 0) + 1;

    const form = {
      id: id,
      content: content,
      shareURL: shareURL,
      userId: userId,
      published: true,
      revision: newRevision,
      firstPublishedAt: currentForm.firstPublishedAt, // Preserve the firstPublishedAt if it exists
    };

    if (isFirstPublish) {
      form.firstPublishedAt = new Date().toISOString();
    }

    const { data: updatedForm, errors } = await client.models.Form.update(form);

    if (errors) {
      console.error(errors);
      throw new Error("Failed to publish the form.");
    }

    return updatedForm;
  } catch (error) {
    console.error("Error publishing form:", error);
    throw new Error("Failed to publish the form.");
  }
}


export async function publishFormAction(formData: FormData) {
  const incomingUserId = formData.get("userId") as string;
  const id = formData.get("id") as string;
  const content = formData.get("content") as string;
  const shareURL = formData.get("shareURL") as string;

  const { data: existingForm, errors } = await client.models.Form.get({ id });

  if (errors || !existingForm) {
    console.error(errors);
    throw new Error("Failed to fetch existing form.");
  }

  const userId = existingForm.userId || incomingUserId;

  await PublishForm(userId, id, content, shareURL);
}

export async function GetFormContentByUrl(formUrl: string) {
  try {
    const formURL = formUrl.startsWith("/submit/") ? formUrl : `/submit/${formUrl}`;

    const { data: forms, errors } = await client.models.Form.list({
      filter: { shareURL: { eq: formURL } },
    });

    if (errors || !forms || forms.length === 0) {
      throw new Error("Form not found.");
    }

    return forms[0];
  } catch (error) {
    console.error("Error fetching form content by URL:", error);
    throw new Error("Error fetching form content by URL.");
  }
}

export async function updateVisitCount(formUrl: string) {
  try {
    const { data: forms } = await client.models.Form.list({
      filter: { shareURL: { eq: `/submit/${formUrl}` } },
    });

    if (forms && forms.length > 0) {
      const form = forms[0];
      const updatedVisits = (form.visits ?? 0) + 1;

      await client.models.Form.update({
        id: form.id,
        visits: updatedVisits,
      });
    }
  } catch (error) {
    console.error("Failed to update visit count:", error);
  }
}

export async function SubmitForm(userId: string, formId: string, formtagId: string, content: string) {
  try {
    // Primeiro buscar o form para obter a revisão atual
    const { data: formList, errors: formFetchErrors } = await client.models.Form.list({
      filter: { id: { eq: formId } },
    });

    if (formFetchErrors || !formList?.length) {
      console.error("Error fetching form:", formFetchErrors);
      throw new Error("Form not found");
    }

    const form = formList[0];

    // Criar submissão com a revisão salva
    const submission = {
      userId,
      formId,
      content,
      createdAt: new Date().toISOString(),
      formRevision: form.revision, // <- aqui salva a revisão atual do form
    };

    const { data: submissionData, errors: submissionErrors } = await client.models.FormSubmissions.create(submission);

    if (submissionErrors || !submissionData?.id) {
      console.error("Error creating submission:", submissionErrors);
      throw new Error("Failed to create submission");
    }

    const submissionId = submissionData.id;

    const { errors: updateFormErrors } = await client.models.Form.update({
      id: form.id,
      submissions: (form.submissions || 0) + 1,
    });

    if (updateFormErrors) {
      console.error("Error updating form submissions:", updateFormErrors);
      throw new Error("Failed to update form submission count");
    }

    const { data: formTag, errors: formTagErrors } = await client.models.FormTag.get({ id: formtagId });

    if (formTagErrors || !formTag) {
      console.error("Error fetching FormTag by ID:", formTagErrors);
      throw new Error("FormTag not found");
    }

    const { errors: updateFormTagErrors } = await client.models.FormTag.update({
      id: formtagId,
      contentTest: submissionId,
    });

    if (updateFormTagErrors) {
      console.error("Error updating FormTag with submission ID:", updateFormTagErrors);
      throw new Error("Failed to update FormTag with submission ID");
    }

    return submissionData;
  } catch (error) {
    throw error;
  }
}


export async function submitFormAction(formData: FormData) {
  const userId = formData.get("userId") as string;
  const formId = formData.get("formId") as string;
  const formtagId = formData.get("formTagId") as string;
  const rawResponses = formData.get("responses") as string;
  const rawFormContent = formData.get("formContent") as string;
  //console.log("formTagId on submit form action", formtagId)
  const submission = {
    responses: JSON.parse(rawResponses),
    formContent: JSON.parse(rawFormContent),
    submittedAt: new Date().toISOString(),
  };

  const jsonContent = JSON.stringify(submission);
  await SubmitForm(userId, formId, formtagId, jsonContent);
}

export async function GetFormWithSubmissions(id: string) {
  try {
    const { data: form, errors } = await client.models.Form.get({ id });

    if (errors) {
      console.error(errors);
      return null;
    }

    if (form) {
      const { data: submissions, errors: submissionErrors } =
        await client.models.FormSubmissions.list({
          filter: { formId: { eq: form.id } },
        });

      if (submissionErrors) {
        console.error(submissionErrors);
      }

      return { form, submissions };
    }

    throw new Error("Form not found.");
  } catch (error) {
    console.error("Error fetching form with submissions:", error);
    throw new Error("Failed to fetch form with submissions.");
  }
}


export async function deleteFormSubmissionCascade(formSubmissionId: string) {
  try {
    const formTag = await findFormTagBySubmissionId(formSubmissionId);

    if (!formTag) {
      throw new Error("No formTag found for this submissionId.");
    }

    const formTag2Id = formTag.id;
    const tagID = formTag.tagID;

    await deleteFormTag(formTag2Id);

    if (tagID) {
      const { data: otherTags, errors } = await client.models.FormTag.list({
        filter: {
          tagID: { eq: tagID },
          id: { ne: formTag2Id },
        },
      });

      if (errors) {
        console.error(errors);
        throw new Error("Error checking other formTags for tagID.");
      }

      const stillUsed = otherTags && otherTags.length > 0;

      if (!stillUsed) {
        await deleteEquipmentTag(tagID);
      }
    }

    await deleteFormSubmission(formSubmissionId);
  } catch (error) {
    console.error("Cascade deletion failed:", error);
    throw error;
  }
}

export async function deleteFormProject(id: string) {
  const { errors } = await client.models.FormProject.delete({ id });
  if (errors) throw new Error("Failed to delete FormProject.");
}

export async function deleteForm(id: string) {
  try {
    const { data: submissions } = await client.models.FormSubmissions.list({
      filter: { formId: { eq: id } },
    });

    for (const sub of submissions ?? []) {
      await deleteFormSubmissionCascade(sub.id);
    }
    const { data: formProjects } = await client.models.FormProject.list({
      filter: { formID: { eq: id } },
    });

    for (const fp of formProjects ?? []) {
      const formProjectId = fp.id;

      const { data: equipmentTags } = await client.models.EquipmentTag.list({
        filter: { formProjectID: { eq: formProjectId } },
      });

      for (const tag of equipmentTags ?? []) {
        await deleteEquipmentTag(tag.id);
      }

      await deleteFormProject(formProjectId);
    }
    const { errors } = await client.models.Form.delete({ id });

    if (errors) {
      console.error(errors);
      throw new Error("Error deleting form.");
    }
  } catch (error) {
    console.error("Error deleting form:", error);
    throw new Error("Failed to delete form.");
  }
}


export async function deleteFormSubmission(id: string) {
  try {
    const { errors } = await client.models.FormSubmissions.delete({ id });
    if (errors) {
      console.error(errors);
      throw new Error("Error deleting form submission.");
    }
  } catch (error) {
    console.error("Error deleting form submission:", error);
    throw new Error("Failed to delete form submission.");
  }
}

export async function deleteFormTag(id: string) {
  try {
    const { errors } = await client.models.FormTag.delete({ id });
    if (errors) {
      console.error(errors);
      throw new Error("Error deleting formTag2.");
    }
  } catch (error) {
    console.error("Error deleting formTag2:", error);
    throw new Error("Failed to delete formTag2.");
  }
}

export async function deleteEquipmentTag(id: string) {
  try {
    const { errors } = await client.models.EquipmentTag.delete({ id });
    if (errors) {
      console.error(errors);
      throw new Error("Error deleting equipmentTag2.");
    }
  } catch (error) {
    console.error("Error deleting equipmentTag2:", error);
    throw new Error("Failed to delete equipmentTag2.");
  }
}

export async function findFormTagBySubmissionId(submissionId: string) {
  try {
    const { data, errors } = await client.models.FormTag.list({
      filter: {
        contentTest: { contains: submissionId },
      },
    });
    //console.log("FormTag2 Data:", data); // Debugging
    if (errors) {
      console.error(errors);
      throw new Error("Error fetching FormTag2.");
    }

    return data?.[0];
  } catch (error) {
    console.error("Error finding FormTag2:", error);
    throw new Error("Failed to find FormTag2.");
  }
}


export async function GetFormWithSubmissionDetails(id: string) {
  try {
    const { data: form, errors: formErrors } = await client.models.Form.get({ id });

    if (formErrors || !form) {
      console.error(formErrors || "Form not found.");
      return null;
    }

    // Paginar FormTags
    const allFormTags: any[] = [];
    let nextFormTagToken: string | undefined;

    do {
      const { data, nextToken, errors } = await client.models.FormTag.list({
        filter: { formID: { eq: form.id } },
        nextToken: nextFormTagToken,
      });

      if (errors || !data) {
        console.error("Error fetching form tags:", errors);
        return null;
      }

      allFormTags.push(...data);
      nextFormTagToken = nextToken ?? undefined;
    } while (nextFormTagToken);

    // Paginar Submissions
    const allSubmissions: any[] = [];
    let nextSubmissionToken: string | undefined;

    do {
      const { data, nextToken, errors } = await client.models.FormSubmissions.list({
        filter: { formId: { eq: form.id } },
        nextToken: nextSubmissionToken,
      });

      if (errors || !data) {
        console.error("Error fetching submissions:", errors);
        return null;
      }

      allSubmissions.push(...data);
      nextSubmissionToken = nextToken ?? undefined;
    } while (nextSubmissionToken);

    const projectLog = await Promise.all(
      allFormTags.map(async (tag) => {
        const rawContentTest = tag.contentTest?.trim() ?? "";
        const contentTestIds =
          rawContentTest === "[]" || rawContentTest === ""
            ? []
            : rawContentTest.split(",").map((s: string) => s.trim());

        const matchedSubmission = allSubmissions.find((s) =>
          contentTestIds.includes(s.id)
        );

        const { data: equipmentTag } = await client.models.EquipmentTag.get({
          id: tag.tagID ?? "",
        });

        let projectName = "Unknown";
        let projectCode = "Unknown";

        const formProjectID = equipmentTag?.formProjectID;
        if (formProjectID) {
          const { data: formProject } = await client.models.FormProject.get({
            id: formProjectID,
          });

          if (formProject?.projectID) {
            const { data: project } = await client.models.Project.get({
              id: formProject.projectID,
            });

            if (project) {
              projectName = project.projectName;
              projectCode = project.projectCode ?? "No Code";
            }
          }
        }

        return {
          formId: form.id,
          formSubmissionsId: matchedSubmission?.id ?? null,
          submittedAt: matchedSubmission?.createdAt ?? null,
          equipmentTag: equipmentTag?.Tag ?? "No Tag",
          formtagId: tag.id,
          contentTest: contentTestIds,
          docNumber: tag.docNumber ?? "No Doc Number",
          projectName,
          projectCode,
          docRevisionNumber: tag.docNumberRevision ?? "0",
        };
      })
    );

    return {
      form,
      projectLog,
    };
  } catch (error) {
    console.error("Error fetching form with submission details:", error);
    throw new Error("Failed to fetch form and submission details.");
  }
}


export async function getMatchingFormSubmissions(submissionId: string) {
  try {
    // Fetch form tags where contentTest contains the submissionId
    const { data: formSubmitted, errors } = await client.models.FormTag.list({
      filter: { contentTest: { contains: submissionId } },
    });

    if (errors) {
      console.error("Error fetching form submissions:", errors);
      return null;
    }
    //console.log("Form Submitted:", formSubmitted); // Debugging
    // Return the first matching FormTag2 ID or null if no match found
    return formSubmitted.length > 0 ? formSubmitted[0].id : null;
  } catch (error) {
    console.error("Error in getMatchingFormSubmissions:", error);
    return null;
  }
}

export async function ResumeTest(formTagId: string) {
  try {
    const { data: formTag, errors } = await client.models.FormTag.get({ id: formTagId });

    if (errors || !formTag) {
      console.error("Error fetching formTag2:", errors);
      return null;
    }

    // Assuming formTag.contentTest holds the content in the correct format
    const contentTest = formTag.contentTest;

    if (!contentTest) {
      console.error("No contentTest found in formTag.");
      return null;
    }

    const parsedContent = JSON.parse(contentTest); // Parse the contentTest to get formContent and responses
    const responses = parsedContent.responses;
    const elements = parsedContent.formContent;

    // Extract formId from formTag
    const formId = formTag.formID;

    return {
      formId,  // Include formId in the return
      elements,  // form elements
      responses, // form responses
    };
  } catch (error) {
    console.error("Error in ResumeTest:", error);
    return null;
  }
}


export async function GetFormSubmissionById(submissionId: string) {
  try {
    const { data: content, errors } = await client.models.FormSubmissions.get({ id: submissionId });

    if (errors || !content) {
      console.warn("Submission not found or has errors", { errors, submissionId });
      return null;
    }

    return content;
  } catch (error) {
    console.error("Error in GetFormSubmissionById:", error);
    return null;
  }
}

type RawForm = {
  id: string;
  name: string | null;
  description?: string | null;
  published: boolean | null;
  content?: string | null;
  createdAt?: string | null;
  visits?: number | null;
  submissions?: number | null;
  equipmentName?: string | null;
  clientName?: string | null;
  formRevision?: number | null;
};

type ClientFormData = {
  clientName: string;
  projectName: string | null;
  projectID: string | null;
  forms: RawForm[];
};

export async function GetFormsInformation(
  userId: string,
  group: string,
  company: string
): Promise<ClientFormData[]> {
  try {
    const allClients: any[] = [];
    let nextClientToken: string | undefined;

    do {
      const { data, nextToken, errors } = await client.models.Client.list({
        nextToken: nextClientToken,
      });
      if (errors || !data) {
        console.error("Error fetching clients:", errors);
        throw new Error("Failed to fetch clients.");
      }
      allClients.push(...data);
      nextClientToken = nextToken ?? undefined;
    } while (nextClientToken);

    const allUserSubmissions: any[] = [];
    let nextSubmissionToken: string | undefined;

    do {
      const { data, nextToken, errors } = await client.models.FormSubmissions.list({
        filter: { userId: { eq: userId } },
        nextToken: nextSubmissionToken,
      });
      if (errors || !data) {
        console.error("Error fetching form submissions:", errors);
        throw new Error("Failed to fetch form submissions.");
      }
      allUserSubmissions.push(...data);
      nextSubmissionToken = nextToken ?? undefined;
    } while (nextSubmissionToken);

    const submittedFormIds = new Set(allUserSubmissions.map((sub) => sub.formId));

    const results: ClientFormData[] = [];

    for (const clientItem of allClients) {
      if (group === "viewer" && clientItem.ClientName !== company) continue;

      const allForms: any[] = [];
      let nextFormToken: string | undefined;

      do {
        const { data, nextToken, errors } = await client.models.Form.list({
          filter: { clientID: { eq: clientItem.id ?? undefined } },
          nextToken: nextFormToken,
        });
        if (errors || !data) {
          console.error("Error fetching forms:", errors);
          throw new Error("Failed to fetch forms.");
        }
        allForms.push(...data);
        nextFormToken = nextToken ?? undefined;
      } while (nextFormToken);

      const visibleForms = allForms.filter((form) => {
        if (group === "admin") return true;
        if (group === "user") return form.userId === userId || submittedFormIds.has(form.id);
        if (group === "viewer") return form.published === true;
        return false;
      });

      if (visibleForms.length > 0) {
        results.push({
          clientName: clientItem.ClientName,
          projectName: null,
          projectID: null,
          forms: visibleForms.map((form) => ({
            id: form.id,
            name: form.name,
            description: form.description,
            published: form.published,
            content: form.content,
            createdAt: form.createdAt,
            visits: form.visits,
            submissions: form.submissions,
            equipmentName: form.equipmentName,
            clientName: clientItem.ClientName,
            formRevision: form.revision,
          })),
        });
      }
    }

    return results;
  } catch (error) {
    console.error("Error", error);
    throw error;
  }
}


type Project = {
  id: string | null;
  projectCode: string | null;
  projectName: string;
  clientID: string | null;
  createdAt?: string;
  updatedAt?: string;
  __typename?: string;
};

export async function GetProjectsFromShareURL(shareURL: string) {
  try {
    const { data: forms, errors: formErrors } = await client.models.Form.list({
      filter: { shareURL: { eq: shareURL } },
    });

    if (formErrors || !forms || forms.length === 0) {
      console.error("Form not found or error:", formErrors);
      throw new Error("Form not found.");
    }

    const form = forms[0];
    if (!form.clientID) {
      throw new Error("Form does not have a clientID.");
    }

    const { data: clients, errors: clientErrors } = await client.models.Client.list({
      filter: { id: { eq: form.clientID } },
    });

    if (clientErrors || !clients || clients.length === 0) {
      console.error("Client not found or error:", clientErrors);
      throw new Error("Client not found.");
    }

    const clientData = clients[0];
    if (!clientData.id) {
      throw new Error("Client ID is null.");
    }

    const allProjects: Project[] = [];
    let nextToken: string | undefined;

    do {
      const {
        data: projectsPage,
        nextToken: newNextToken,
        errors: projectErrors,
      }: {
        data: Project[];
        nextToken?: string | null;
        errors?: unknown;
      } = await client.models.Project.list({
        filter: { clientID: { eq: clientData.id } },
        nextToken,
      });

      if (projectErrors) {
        console.error("Error fetching projects:", JSON.stringify(projectErrors, null, 2));
        throw new Error("Error fetching projects");
      }

      allProjects.push(...projectsPage);
      nextToken = newNextToken ?? undefined;
    } while (nextToken);

    const projectList = allProjects
      .filter((p) => p.projectCode && p.id && p.clientID)
      .sort((a, b) => b.projectCode!.localeCompare(a.projectCode!))
      .map((project) => ({
        projectCode: project.projectCode!,
        name: project.projectName,
      }));

    return { projectList };
  } catch (error) {
    console.error("Error in GetProjectsFromShareURL:", error);
    throw error;
  }
}



export async function CreateForm(
  _name: string,
  equipmentName: string,
  description: string,
  userId: string,
  clientID: string,
) {
  // Fetch all forms for the client
  const { data: clientForms, errors: clientFormErrors } = await client.models.Form.list({
    filter: {
      clientID: { eq: clientID },
    },
  });

  if (clientFormErrors) {
    console.error("Error fetching client forms:", clientFormErrors);
    throw new Error("Error fetching existing forms.");
  }

  // Get the client to retrieve the code
  const { data: clients } = await client.models.Client.list();
  const matchedClient = clients?.find((c) => c.id === clientID);
  const clientCode = matchedClient?.ClientCode ?? "XXX";

  // Calculate the next sequence number
  const formCount = clientForms?.length ?? 0;
  const sequenceNumber = formCount.toString().padStart(4, "0");
  const name = `${clientCode}FRM-${sequenceNumber}`;

  // Create the form
  const { errors: formErrors, data: form } = await client.models.Form.create({
    equipmentName,
    name,
    description,
    userId,
    clientID,
  });

  if (formErrors) {
    console.error("Error creating form:", formErrors);
    throw new Error("Something went wrong while creating the form");
  }

  return {
    formId: form?.id,
    equipmentName,
    name,
  };
}

export async function GetNextFormName(clientId: string) {
  // Paginar clientes para garantir que achamos o clientId
  const allClients: Client[] = [];
  let nextClientToken: string | undefined;

  do {
    const {
      data: clientsPage,
      nextToken: newNextToken,
      errors: clientErrors,
    } = (await client.models.Client.list({ nextToken: nextClientToken })) as {
      data: Client[];
      nextToken?: string | null;
      errors?: unknown;
    };

    if (clientErrors || !clientsPage) {
      console.error("Error fetching clients:", clientErrors);
      throw new Error("Failed to fetch clients.");
    }

    allClients.push(...clientsPage);
    nextClientToken = newNextToken ?? undefined;
  } while (nextClientToken);

  const matchedClient = allClients.find((c) => c.id === clientId);
  if (!matchedClient) throw new Error("Client not found");

  const code = matchedClient.ClientCode ?? "XXX";

  // Paginar forms para contar todos os formulários do cliente
  type Form = {
    id: string;
    clientID: string | null;
    // outras propriedades necessárias
  };

  const allForms: Form[] = [];
  let nextFormToken: string | undefined;

  do {
    const {
      data: formsPage,
      nextToken: newNextToken,
      errors: formErrors,
    } = (await client.models.Form.list({
      filter: { clientID: { eq: clientId } },
      nextToken: nextFormToken,
    })) as {
      data: Form[];
      nextToken?: string | null;
      errors?: unknown;
    };

    if (formErrors || !formsPage) {
      console.error("Error fetching forms:", formErrors);
      throw new Error("Failed to fetch forms.");
    }

    allForms.push(...formsPage);
    nextFormToken = newNextToken ?? undefined;
  } while (nextFormToken);

  const count = allForms.length;
  const paddedNumber = count.toString().padStart(4, "0");

  return `${code}-FRM-${paddedNumber}`;
}





export const runForm = async (
  shareUrl: string,
  equipmentTag: string,
  docNumber: string,
  projectCode: string,
  forceRevision: boolean = false
): Promise<{
  success: boolean;
  createdTagID?: string;
  tagCreatedAt?: string;
  revisionBumped?: boolean;
  createdFormTagID?: string;
}> => {
  try {
    let form: any = null;
    let token: string | undefined = undefined;

    // 1. Get form (pagination)
    do {
      const response: {
        data?: any[];
        nextToken?: string | null;
      } = await client.models.Form.list({
        filter: { shareURL: { eq: shareUrl } },
        nextToken: token,
      });

      const data = response.data;
      const newToken = response.nextToken ?? undefined;

      if (data && data.length > 0) {
        form = data[0];
        break;
      }

      token = newToken;
    } while (token);

    if (!form) return { success: false };

    // 2. Get project (pagination)
    let project: any = null;
    token = undefined;
    do {
      const response: {
        data?: any[];
        nextToken?: string | null;
      } = await client.models.Project.list({
        filter: { projectCode: { eq: projectCode } },
        nextToken: token,
      });

      const data = response.data;
      const newToken = response.nextToken ?? undefined;

      if (data && data.length > 0) {
        project = data[0];
        break;
      }

      token = newToken;
    } while (token);

    if (!project) return { success: false };

    // 3. Get or create FormProject (pagination)
    let formProject: any = null;
    token = undefined;
    do {
      const response: {
        data?: any[];
        nextToken?: string | null;
      } = await client.models.FormProject.list({
        filter: {
          formID: { eq: form.id },
          projectID: { eq: project.id },
        },
        nextToken: token,
      });

      const data = response.data;
      const newToken = response.nextToken ?? undefined;

      if (data && data.length > 0) {
        formProject = data[0];
        break;
      }

      token = newToken;
    } while (token);

    if (!formProject) {
      const created = await client.models.FormProject.create({
        formID: form.id,
        projectID: project.id,
      });
      if (!created.data) return { success: false };
      formProject = created.data;
    }

    // 4. Get or create EquipmentTag (pagination)
    let equipTag: any = null;
    token = undefined;
    do {
      const response: {
        data?: any[];
        nextToken?: string | null;
      } = await client.models.EquipmentTag.list({
        filter: {
          formProjectID: { eq: formProject.id },
          Tag: { eq: equipmentTag },
        },
        nextToken: token,
      });

      const data = response.data;
      const newToken = response.nextToken ?? undefined;

      if (data && data.length > 0) {
        equipTag = data[0];
        break;
      }

      token = newToken;
    } while (token);

    if (!equipTag) {
      const created = await client.models.EquipmentTag.create({
        Tag: equipmentTag,
        formProjectID: formProject.id,
      });
      if (!created.data) return { success: false };
      equipTag = created.data;
    }

    // 5. Check if FormTag exists (pagination)
    const existingFormTags: any[] = [];
    token = undefined;
    do {
      const response: {
        data?: any[];
        nextToken?: string | null;
      } = await client.models.FormTag.list({
        filter: { docNumber: { eq: docNumber } },
        nextToken: token,
      });

      const data = response.data;
      const newToken = response.nextToken ?? undefined;

      if (data) existingFormTags.push(...data);
      token = newToken;
    } while (token);

    const revisionBumped = existingFormTags.length > 0;

    if (revisionBumped && !forceRevision) {
      return { success: false, revisionBumped: true };
    }

    const nextRevision = revisionBumped
      ? Math.max(...existingFormTags.map((f) => f.docNumberRevision ?? 0)) + 1
      : 0;

    // 6. Create FormTag
    const formTagResp = await client.models.FormTag.create({
      formID: form.id,
      tagID: equipTag.id,
      docNumber,
      docNumberRevision: nextRevision,
    });

    if (!formTagResp.data) return { success: false };

    return {
      success: true,
      createdTagID: equipTag.id,
      tagCreatedAt: equipTag.createdAt,
      revisionBumped,
      createdFormTagID: formTagResp.data.id,
    };
  } catch (error) {
    console.error("Error executing runForm:", error);
    return { success: false };
  }
};



export async function SaveFormAfterTest(formtagId: string, content: string) {
  try {
    const { data: formTag, errors } = await client.models.FormTag.get({ id: formtagId });

    if (errors || !formTag) {
      console.error("Error fetching FormTag by ID:", errors);
      return;
    }

    const updated = await client.models.FormTag.update({
      id: formtagId,
      contentTest: content,
    });

    if (!updated || updated.errors) {
      console.error("Update failed:", updated.errors);
    }

    return updated;
  } catch (err) {
    console.error("Error SaveFormAfterTest:", err);
  }
}

export async function SaveFormAfterTestAction(formData: FormData) {
  const formtagId = formData.get("formTagId") as string;
  const rawResponses = formData.get("responses") as string;
  const rawFormContent = formData.get("formContent") as string;

  if (!formtagId) {
    throw new Error("Missing formtagID");
  }

  const submission = {
    responses: JSON.parse(rawResponses),
    formContent: JSON.parse(rawFormContent),
  };

  const jsonContent = JSON.stringify(submission);
  await SaveFormAfterTest(formtagId, jsonContent);
}



export async function GetTagIDWithFormIdandFormTagID(formId: string, formtagID: string): Promise<string | null> {
  try {
    const { data, errors } = await client.models.FormTag.list({
      filter: {
        formID: { eq: formId },
        id: { eq: formtagID },
      },
    });

    if (errors) {
      console.error("Error:", errors);
      return null;
    }

    if (!data || data.length === 0) {
      console.warn("No matching FormTag2 found");
      return null;
    }

    return data[0].tagID || null;
  } catch (err) {
    console.error("Error GetTagIDWithFormIdandFormTagID:", err);
    return null;
  }
}

export async function getContentByFormIDandTagID(
  FormID: string,
  TagID: string,
) {
  try {
    const { data: formTags, errors } = await client.models.FormTag.list({
      filter: {
        formID: { eq: FormID },
        tagID: { eq: TagID },
      },
    });

    if (errors) {
      console.error("Error:", errors);
      return;
    }

    const formTag = formTags[0];

    if (!formTag) {
      console.error("Nothing found for this formID and tagID");
      return;
    }

    const content = formTag.contentTest;

    //console.log("Fetched content:", content);
    return content;
  } catch (err) {
    console.error("Error getContentByFormIDandTagID:", err);
  }
}

export async function GetFormNameFromSubmissionId(FormSubmissionsId: string) {
  try {
    const { data: formTags, errors } = await client.models.FormTag.list({
      filter: { contentTest: { eq: FormSubmissionsId } },
    });

    if (errors || formTags.length === 0) {
      throw new Error("No FormTag found with this submission ID.");
    }

    const formTag = formTags[0];
    const formId = formTag.formID;
    const docNumber = formTag.docNumber;
    const docNumberRevision = formTag.docNumberRevision;
    const tagID = formTag.tagID;

    const { data: submission, errors: submissionErrors } = await client.models.FormSubmissions.get({
      id: FormSubmissionsId,
    });

    if (submissionErrors || !submission) {
      throw new Error("Submission not found.");
    }

    const formRevision = submission.formRevision ?? 0;

    const { data: forms, errors: formErrors } = await client.models.Form.list({
      filter: { id: { eq: formId ?? undefined } },
    });

    if (formErrors || forms.length === 0) {
      throw new Error("Form not found.");
    }

    const form = forms[0];
    const formName = form.name ?? null;
    const equipmentName = form.equipmentName ?? null;

    let equipmentTag: string | null = null;
    if (tagID) {
      const { data: equipmentTagData, errors: equipmentTagErrors } = await client.models.EquipmentTag.get({
        id: tagID,
      });

      if (!equipmentTagErrors && equipmentTagData?.Tag) {
        equipmentTag = equipmentTagData.Tag;
      }
    }

    return {
      formName,
      revision: formRevision,
      docNumber,
      docNumberRevision,
      equipmentTag,
      equipmentName,
    };
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

export async function GetFormsContent(FormSubmissionsId: string) {

  if (!FormSubmissionsId || FormSubmissionsId.trim() === "") {
    console.error("FormSubmissionsId is missing or empty.");
    throw new Error("Invalid FormSubmissionsId.");
  }

  const { data, errors } = await client.models.FormSubmissions.get({ id: FormSubmissionsId });

  if (errors || !data) {
    console.error("Error fetching form submission or submission not found:", errors);
    throw new Error("Form submission not found.");
  }

  return data.content;
}

import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { fromEnv } from "@aws-sdk/credential-providers";

const clients = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION!,
  credentials: fromEnv(),
});

export async function listUsers() {
  const command = new ListUsersCommand({
    UserPoolId: process.env.COGNITO_USER_POOL_ID!,
    Limit: 50,
  });

  try {
    const { Users } = await clients.send(command);
    return Users?.map(user => {
      const email = user.Attributes?.find(attr => attr.Name === "email")?.Value || "";
      const name = user.Attributes?.find(attr => attr.Name === "name")?.Value || "";
      return { email, name };
    }).filter(user => user.email);
  } catch (err) {
    console.error("Error listing users:", err);
    return [];
  }
}


export async function TurnEditable(formId: string) {
  try {
    const form = {
      id: formId,
      published: false,
    };
    const { errors } = await client.models.Form.update(form);

    if (errors) {
      console.error(errors);
      throw new Error("Failed to turn the form editable.");
    }
  } catch (error) {
    console.error("Error to turn the form editable:", error);
    throw new Error("Failed to turn the form editable.");
  }
}

export async function getProjects() {
  try {
    const response = await client.queries.getProjects();

    if (typeof response !== 'string') {
      throw new Error('Expected a string response from getProjects');
    }

    const data = JSON.parse(response);

    if (!Array.isArray(data)) {
      throw new Error('Expected response to be an array');
    }

    return data;
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return [];
  }
}


