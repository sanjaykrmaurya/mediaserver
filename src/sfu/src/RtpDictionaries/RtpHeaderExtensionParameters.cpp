#define MS_CLASS "RTC::RtpHeaderExtensionParameters"
// #define MS_LOG_DEV_LEVEL 3

#include "LoggerTag.h"
#include "base/error.h"
#include "Utils.h"
#include "RTC/RtpDictionaries.h"

namespace RTC
{
	/* Instance methods. */

	RtpHeaderExtensionParameters::RtpHeaderExtensionParameters(json& data)
	{
		MS_TRACE();

		if (!data.is_object())
			base::uv::throwError("data is not an object");

		auto jsonUriIt        = data.find("uri");
		auto jsonIdIt         = data.find("id");
		auto jsonEncryptIt    = data.find("encrypt");
		auto jsonParametersIt = data.find("parameters");

		// uri is mandatory.
		if (jsonUriIt == data.end() || !jsonUriIt->is_string())
			base::uv::throwError("missing uri");

		this->uri = jsonUriIt->get<std::string>();

		if (this->uri.empty())
			base::uv::throwError("empty uri");

		// Get the type.
		this->type = RTC::RtpHeaderExtensionUri::GetType(this->uri);

		// id is mandatory.
		if (jsonIdIt == data.end() || !Utils::Json::IsPositiveInteger(*jsonIdIt))
			base::uv::throwError("missing id");

		this->id = jsonIdIt->get<uint8_t>();

		// Don't allow id 0.
		if (this->id == 0u)
			base::uv::throwError("invalid id 0");

		// encrypt is optional.
		if (jsonEncryptIt != data.end() && jsonEncryptIt->is_boolean())
			this->encrypt = jsonEncryptIt->get<bool>();

		// parameters is optional.
		if (jsonParametersIt != data.end() && jsonParametersIt->is_object())
			this->parameters.Set(*jsonParametersIt);
	}

	void RtpHeaderExtensionParameters::FillJson(json& jsonObject) const
	{
		MS_TRACE();

		// Add uri.
		jsonObject["uri"] = this->uri;

		// Add id.
		jsonObject["id"] = this->id;

		// Add encrypt.
		jsonObject["encrypt"] = this->encrypt;

		// Add parameters.
		this->parameters.FillJson(jsonObject["parameters"]);
	}
} // namespace RTC
